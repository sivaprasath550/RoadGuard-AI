// useAuth.ts — React Query hooks that bridge the API and Zustand store.
//
// THE THREE-LAYER PATTERN:
//   authApi.ts     → Raw async functions (no React)
//   useAuth.ts     → React Query mutations/queries (caching, loading, errors)
//   authStore.ts   → Zustand state (who is logged in, right now)
//
// Components import from useAuth.ts only — they never touch the layers below.
//
// WHY USE REACT QUERY FOR MUTATIONS?
// useMutation() gives us for free:
//   - isPending: show a loading spinner while the request is in flight
//   - isError:   show an error message if the request fails
//   - error:     the actual error object (with the server's message)
//   - onSuccess: callback after success (update Zustand, navigate, show toast)
//   - onError:   callback after failure (show toast)
// All this would be 30+ lines of useEffect + useState without React Query.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/authApi'
import { useAuthStore } from '../store/authStore'
import { LoginInput, RegisterInput, ApiError } from '../types'

// ── useCurrentUser ────────────────────────────────────────────────────
// Fetches the current user from the server on app load.
// Used in the root component to "bootstrap" authentication state.
//
// React Query caches this under the key ['user', 'me'].
// Any component can call useCurrentUser() and get the cached data instantly.
export function useCurrentUser() {
  const { setUser, clearUser, setLoading } = useAuthStore()

  return useQuery({
    queryKey: ['user', 'me'],

    queryFn: async () => {
      setLoading(true)
      try {
        const user = await authApi.getMe()
        setUser(user)   // Sync to Zustand store
        return user
      } catch {
        clearUser()     // No valid session
        return null
      } finally {
        setLoading(false)
      }
    },

    // How long this data is considered fresh.
    // If user navigates away and back within 5 min, no refetch needed.
    staleTime: 1000 * 60 * 5,

    // Retry once — if /auth/me returns 401, the user isn't logged in.
    // No point retrying auth failures.
    retry: false,
  })
}

// ── useRegister ───────────────────────────────────────────────────────
export function useRegister() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    // mutationFn: the async function that does the work
    mutationFn: (data: RegisterInput) => authApi.register(data),

    onSuccess: (response) => {
      // Update Zustand store with the new user
      setUser(response.data.user)

      // Populate React Query's cache so useCurrentUser() returns immediately
      queryClient.setQueryData(['user', 'me'], response.data.user)

      // Navigate to the map (main app)
      navigate('/map', { replace: true })
    },

    onError: (error: ApiError) => {
      // Error is available via mutation.error in the component.
      // We don't show a toast here — the component handles UI feedback.
      console.error('Registration failed:', error.response?.data?.error)
    },
  })
}

// ── useLogin ──────────────────────────────────────────────────────────
export function useLogin() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data),

    onSuccess: (response) => {
      setUser(response.data.user)
      queryClient.setQueryData(['user', 'me'], response.data.user)
      navigate('/map', { replace: true })
    },

    onError: (error: ApiError) => {
      console.error('Login failed:', error.response?.data?.error)
    },
  })
}

// ── useLogout ─────────────────────────────────────────────────────────
export function useLogout() {
  const navigate = useNavigate()
  const { clearUser } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.logout(),

    onSuccess: () => {
      // Clear Zustand store
      clearUser()

      // Remove ALL cached query data — the user's data should not persist
      // after logout (especially important on shared devices).
      queryClient.clear()

      navigate('/login', { replace: true })
    },
  })
}
