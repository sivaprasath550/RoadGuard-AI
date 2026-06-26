// Shared TypeScript types used across the backend.
// Centralizing types prevents drift — one definition, used everywhere.

import { Request } from 'express'
import { IUser } from '../models/User'

// ── Augment Express Request ───────────────────────────────────────────
// By default, Express's req object doesn't know about req.user.
// We extend the Express namespace to add our custom field.
//
// "Declaration merging" — TypeScript merges this interface with Express's
// built-in Request interface. After this, req.user is typed everywhere.
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload  // Attached by authenticate middleware after JWT verification
    }
  }
}

// What we extract from the JWT and attach to req.user
export interface AuthPayload {
  userId: string
  email:  string
  role:   'user' | 'moderator' | 'admin'
}

// Shape of the JWT tokens we issue
export interface TokenPair {
  accessToken:  string
  refreshToken: string
}

// API response wrapper — consistent shape for all responses
export interface ApiResponse<T = undefined> {
  success: boolean
  message?: string
  data?:    T
  error?:   string
}

// Sanitized user for API responses (no password)
export type SafeUser = Omit<IUser, 'password' | 'comparePassword'>
