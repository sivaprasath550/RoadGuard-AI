// authenticate.ts — JWT verification middleware.
//
// This middleware is placed BEFORE any route handler that requires login.
// It runs in the middleware chain, reads the access token cookie,
// verifies the JWT signature, and attaches the payload to req.user.
//
// EXECUTION FLOW:
//   Request arrives
//       ↓
//   authenticate(req, res, next)    ← This file
//       ↓ (if valid)
//   next() → route handler runs    ← req.user is available here
//       ↓ (if invalid)
//   res.status(401).json(...)      ← Chain stops, route never runs
//
// WHY MIDDLEWARE INSTEAD OF INSIDE EACH CONTROLLER?
// If we checked the JWT in every controller, we'd repeat 15 lines of code
// across 20 routes. A bug fix would require updating 20 files.
// One middleware, applied once per protected route = DRY principle.

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthPayload } from '../types'

export function authenticate(req: Request, res: Response, next: NextFunction) {
  // Read the access token from HttpOnly cookie.
  // cookie-parser middleware (in app.ts) parses the Cookie header
  // and populates req.cookies as a plain object.
  const token = req.cookies?.accessToken

  // Also support Authorization: Bearer <token> header.
  // This allows non-browser clients (mobile apps, Postman) to authenticate.
  // Cookies are automatic in browsers, but mobile apps use headers.
  const authHeader = req.headers.authorization
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)  // Remove "Bearer " prefix
    : null

  const jwtToken = token || bearerToken

  if (!jwtToken) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
    })
  }

  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) {
    // This should never happen in production — it means a misconfigured server.
    // We throw a 500 rather than 401 because it's OUR fault, not the user's.
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
    })
  }

  try {
    // jwt.verify() does three things:
    // 1. Decodes the header to get the algorithm
    // 2. Recomputes the signature and compares — if they differ, throws
    // 3. Checks the 'exp' claim — if token is expired, throws TokenExpiredError
    //
    // If verification succeeds, it returns the decoded payload as a JS object.
    const payload = jwt.verify(jwtToken, secret) as AuthPayload

    // Attach the verified payload to the request object.
    // All subsequent middleware and route handlers can now read req.user.
    // TypeScript knows about this because we declared it in types/index.ts.
    req.user = {
      userId: payload.userId,
      email:  payload.email,
      role:   payload.role,
    }

    // Call next() to pass control to the next middleware or route handler.
    // Without this call, the request hangs forever — no response is sent.
    next()

  } catch (error: any) {
    // jwt.verify() throws named errors we can distinguish:
    if (error.name === 'TokenExpiredError') {
      // Access token expired — frontend should call /api/auth/refresh
      return res.status(401).json({
        success: false,
        error:   'Token expired',
        code:    'TOKEN_EXPIRED',  // Frontend uses this code to trigger refresh
      })
    }

    // Invalid signature, malformed token, wrong secret, etc.
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token',
    })
  }
}

// ── Authorization Middleware ───────────────────────────────────────────
// After authentication (who are you?), we sometimes need authorization (what can you do?).
// This factory creates role-checking middleware.
//
// Usage: router.delete('/admin/users/:id', authenticate, authorize('admin'), controller)
//
// HOW FACTORY FUNCTIONS WORK:
// authorize('admin') is called WHEN the route is defined (at startup).
// It RETURNS a middleware function that runs on every request to that route.
// The returned middleware closes over 'allowedRoles' via closure.
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // authenticate must run first — req.user must exist
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        // 403 Forbidden (vs 401 Unauthorized):
        // 401 = "I don't know who you are" (not authenticated)
        // 403 = "I know who you are, but you can't do this" (not authorized)
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      })
    }

    next()
  }
}
