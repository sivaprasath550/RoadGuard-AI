// api.ts — the configured Axios instance shared by the entire app.
//
// WHY A SHARED INSTANCE?
// If every component creates its own axios.get('/url'), there's no central
// place to add auth headers, handle token refresh, or configure base URLs.
//
// One shared instance = one place to configure everything.
// Every service file imports THIS instance, not axios directly.

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

// Create a configured Axios instance.
// All requests made with 'api' will use these defaults.
export const api = axios.create({
  // In development, Vite's proxy intercepts /api requests and forwards to :5000.
  // In production, this would be the actual backend URL from env vars.
  baseURL: '/api',

  // Request timeout: if server doesn't respond in 10 seconds, throw an error.
  // Without this, a hung server causes the browser to wait indefinitely.
  timeout: 10_000,

  // withCredentials: true is CRITICAL for cookies.
  // Without this, the browser will NOT send cookies on cross-origin requests.
  // Even though Vite proxies in dev (same origin), production is cross-origin.
  // Always set this to true when using HttpOnly cookie auth.
  withCredentials: true,

  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Token Refresh Logic ───────────────────────────────────────────────
// This flag prevents infinite loops:
// If the refresh request itself returns 401, we don't want to try
// refreshing again (we'd loop forever).
let isRefreshing = false

// Queue of requests that were made while a refresh was in-progress.
// After refresh succeeds, we replay all queued requests.
// Type: array of { resolve, reject } from Promise constructors.
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject:  (reason?: unknown) => void
}> = []

function processQueue(error: Error | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve()
    }
  })
  failedQueue = []
}

// ── Response Interceptor ──────────────────────────────────────────────
// Runs after EVERY response is received.
// The first callback handles success (2xx), second handles errors.
api.interceptors.response.use(
  // Success handler: just pass through (no transformation needed)
  (response) => response,

  // Error handler: intercept 401s and attempt token refresh
  async (error: AxiosError) => {
    // The original request config — we need this to replay the request
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    const status   = error.response?.status
    const code     = (error.response?.data as any)?.code

    // Only attempt refresh if:
    // 1. Status is 401 (Unauthorized)
    // 2. The error code is TOKEN_EXPIRED (not just "invalid token")
    // 3. We haven't already retried this request (prevents infinite loops)
    // 4. The failing request is NOT the refresh endpoint itself
    const isTokenExpired = status === 401 && code === 'TOKEN_EXPIRED'
    const isNotRefreshEndpoint = !originalRequest.url?.includes('/auth/refresh')
    const isNotAlreadyRetried = !originalRequest._retry

    if (isTokenExpired && isNotRefreshEndpoint && isNotAlreadyRetried) {
      // If another request is already refreshing, queue this one.
      // Example: User has 3 simultaneous requests, all get 401.
      // Only the FIRST one should hit /refresh. The other 2 wait in the queue.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(originalRequest))
          .catch((err) => Promise.reject(err))
      }

      // Mark this request as retried and begin refresh
      originalRequest._retry = true
      isRefreshing = true

      try {
        // Call the refresh endpoint.
        // The browser automatically sends the refreshToken cookie (withCredentials: true).
        // The server responds with new cookies set in the response.
        await api.post('/auth/refresh')

        // Refresh succeeded — release all queued requests
        processQueue(null)
        isRefreshing = false

        // Retry the original failed request (now with the new access token cookie)
        return api(originalRequest)

      } catch (refreshError) {
        // Refresh token is also expired or invalid — user must log in again
        processQueue(refreshError as Error)
        isRefreshing = false

        // Clear the auth store and redirect to login
        // We use window.location instead of React Router because this code
        // runs outside React's component tree (in an interceptor).
        window.location.href = '/login'

        return Promise.reject(refreshError)
      }
    }

    // For all other errors (400, 403, 404, 500, etc.), just reject normally.
    // React Query's onError handler or the caller's .catch() will handle them.
    return Promise.reject(error)
  }
)
