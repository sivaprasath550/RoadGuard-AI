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

// ── Hazard ────────────────────────────────────────────────────────────
export type HazardType     = 'pothole' | 'flooding' | 'fallen_tree' | 'construction' | 'accident'
export type HazardSeverity = 'low' | 'medium' | 'high'
export type HazardStatus   = 'active' | 'resolved'

export interface Hazard {
  _id:         string
  type:        HazardType
  description: string
  severity:    HazardSeverity
  status:      HazardStatus
  location: {
    type:        'Point'
    coordinates: [number, number]  // [longitude, latitude] — GeoJSON order
  }
  imageUrl:    string
  reportedBy:  User | string      // populated or just an ObjectId string
  verifiedBy:  string[]
  createdAt:   string
  updatedAt:   string
}

export interface CreateHazardInput {
  type:        HazardType
  description: string
  severity:    HazardSeverity
  latitude:    number
  longitude:   number
  image:       File
}

// Human-readable labels and map pin colors for each hazard type
export const HAZARD_META: Record<HazardType, { label: string; color: string; emoji: string }> = {
  pothole:      { label: 'Pothole',       color: '#F59E0B', emoji: '🕳️'  },
  flooding:     { label: 'Flooding',      color: '#3B82F6', emoji: '🌊'  },
  fallen_tree:  { label: 'Fallen Tree',   color: '#10B981', emoji: '🌳'  },
  construction: { label: 'Construction',  color: '#8B5CF6', emoji: '🚧'  },
  accident:     { label: 'Accident',      color: '#EF4444', emoji: '🚨'  },
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
