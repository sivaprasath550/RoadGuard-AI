// Shared TypeScript interfaces for the entire frontend.
// These mirror the backend's data shapes.
// In a more advanced setup, these types would be auto-generated from
// the backend's Zod schemas using a tool like zod-to-ts or tRPC.

export interface User {
  _id:        string
  name:       string
  email:      string
  role:       'user' | 'moderator' | 'admin'
  avatar?:    string
  location?: {
    type:        'Point'
    coordinates: [number, number]  // [longitude, latitude]
  }
  isVerified: boolean
  createdAt:  string
  updatedAt:  string
}

// ── Auth ──────────────────────────────────────────────────────────────
export interface RegisterInput {
  name:     string
  email:    string
  password: string
}

export interface LoginInput {
  email:    string
  password: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: User
  }
}

// ── API ───────────────────────────────────────────────────────────────
// Generic wrapper for all API responses from our backend
export interface ApiResponse<T = undefined> {
  success: boolean
  message?: string
  data?:    T
  error?:   string
}

// Axios errors have this shape when the server returns an error response
export interface ApiError {
  message:  string
  response?: {
    data: {
      error:   string
      code?:   string  // e.g. 'TOKEN_EXPIRED'
      stack?:  string  // only in development
    }
    status: number
  }
}
