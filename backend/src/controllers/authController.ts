// authController.ts — the HTTP layer for auth.
//
// CONTROLLER RESPONSIBILITY (thin layer):
//   1. Parse the request (req.body, req.cookies)
//   2. Call the service
//   3. Set cookies on the response
//   4. Send the HTTP response
//
// The controller knows about HTTP. The service does NOT.
// Business logic (validation, bcrypt, JWT signing) lives in the service.
// Cookie management is HTTP-specific, so it lives here.

import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/authService'

// ── Cookie Configuration ──────────────────────────────────────────────
// Centralizing cookie options prevents drift — one place to update settings.

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Access token cookie: short-lived (15 minutes)
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,    // JavaScript CANNOT read this cookie (defeats XSS)
  secure:   IS_PRODUCTION,  // Only send over HTTPS in production
  sameSite: 'strict' as const,  // Never sent on cross-site requests (defeats CSRF)
  maxAge:   15 * 60 * 1000,    // 15 minutes in milliseconds
  path:     '/',
}

// Refresh token cookie: long-lived (7 days)
// Path is /api/auth — the refresh token cookie is ONLY sent to the refresh endpoint.
// If path were '/', the browser would send it on every API call unnecessarily.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   IS_PRODUCTION,
  sameSite: 'strict' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 days in milliseconds
  path:     '/api/auth',  // Only sent to auth routes
}

// Helper: Set both auth cookies on the response
function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  // res.cookie(name, value, options) sets a Set-Cookie response header.
  // The browser reads Set-Cookie and stores it automatically.
  // On all future requests to this domain, the browser sends: Cookie: accessToken=eyJ...
  res.cookie('accessToken', tokens.accessToken, ACCESS_COOKIE_OPTIONS)
  res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS)
}

// Helper: Clear both auth cookies (for logout)
function clearAuthCookies(res: Response) {
  // To delete a cookie, set it with maxAge: 0 (or expires in the past).
  // The browser then removes it immediately.
  res.clearCookie('accessToken',  { path: '/' })
  res.clearCookie('refreshToken', { path: '/api/auth' })
}

// ── Controllers ───────────────────────────────────────────────────────
// Each controller is an async Express route handler.
// We DON'T use try/catch here — we use a wrapper pattern.
// The asyncHandler (below) wraps each function and catches errors,
// passing them to Express's error handler via next(error).
// This keeps controllers clean and DRY.

export const authController = {

  // POST /api/auth/register
  register: asyncHandler(async (req: Request, res: Response) => {
    // req.body is populated by express.json() middleware we added in app.ts.
    // At this point, it's a plain JS object — but it could contain ANYTHING.
    // The authService.register() will Zod-validate it.
    const { user, tokens } = await authService.register(req.body)

    setAuthCookies(res, tokens)

    // 201 Created — used for successful resource creation (not 200 OK)
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user },
    })
  }),

  // POST /api/auth/login
  login: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.login(req.body)

    setAuthCookies(res, tokens)

    // 200 OK — login is not resource creation, so 200 (not 201)
    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: { user },
    })
  }),

  // POST /api/auth/logout
  logout: asyncHandler(async (_req: Request, res: Response) => {
    // Server-side logout is simple with cookies:
    // Just delete the cookies. The JWT becomes unreachable by the client.
    // NOTE: The JWT itself is still technically valid until it expires (15 min).
    // For high-security apps, you'd maintain a JWT blocklist in Redis.
    // For our app, clearing the cookie is sufficient.
    clearAuthCookies(res)

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    })
  }),

  // POST /api/auth/refresh
  // Called automatically by the frontend when it gets a 401 response.
  refresh: asyncHandler(async (req: Request, res: Response) => {
    // Read the refresh token from cookies.
    // req.cookies is populated by cookie-parser middleware (added in app.ts).
    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token provided',
      })
    }

    const tokens = await authService.refreshTokens(refreshToken)
    setAuthCookies(res, tokens)

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed',
    })
  }),

  // GET /api/auth/me
  // Returns the currently authenticated user's data.
  // The authenticate middleware (built next) must run before this.
  me: asyncHandler(async (req: Request, res: Response) => {
    // req.user is attached by the authenticate middleware after JWT verification.
    // It contains: { userId, email, role }
    const userId = req.user!.userId

    const user = await import('../models/User').then(m =>
      m.default.findById(userId).lean()
    )

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      })
    }

    res.status(200).json({
      success: true,
      data: { user },
    })
  }),
}

// ── asyncHandler Wrapper ──────────────────────────────────────────────
// This is a higher-order function that wraps async route handlers.
//
// PROBLEM without asyncHandler:
//   If an async function throws, Express doesn't catch it automatically.
//   The error causes an "UnhandledPromiseRejection" and crashes the server.
//
// SOLUTION:
//   Wrap every async handler in a try/catch that calls next(error).
//   Express's global error handler in app.ts then handles it.
//
// HOW IT WORKS:
//   asyncHandler(fn) returns a NEW function.
//   That new function calls fn(req, res, next).catch(next).
//   If the Promise rejects, .catch(next) passes the error to Express.
//
// This is so common in Express that many apps use the 'express-async-handler'
// npm package for exactly this. We build our own to understand the pattern.
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // fn() returns a Promise. If it rejects, .catch(next) is called.
    // next(error) triggers Express's error handling middleware chain.
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
