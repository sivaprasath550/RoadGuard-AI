import { api } from './api'
import type { Hazard, CreateHazardInput, ApiResponse } from '../types'

// ── getNearbyHazards ──────────────────────────────────────────────────
// GET /api/hazards/nearby?latitude=...&longitude=...&radius=5000
// Called by useQuery on the map page to load pins near the user.
export async function getNearbyHazards(
  latitude: number,
  longitude: number,
  radius = 5000
): Promise<Hazard[]> {
  const res = await api.get<ApiResponse<{ hazards: Hazard[]; count: number }>>(
    '/hazards/nearby',
    { params: { latitude, longitude, radius } }
  )
  return res.data.data?.hazards ?? []
}

// ── createHazard ──────────────────────────────────────────────────────
// POST /api/hazards  (multipart/form-data — includes an image file)
//
// WHY FormData instead of JSON?
// JSON can only carry text. Images are binary data.
// multipart/form-data is the HTTP encoding designed for mixed text + binary.
//
// Axios automatically sets Content-Type: multipart/form-data with the
// correct boundary string when you pass a FormData object as the body.
// DO NOT set Content-Type manually — Axios must generate the boundary.
export async function createHazard(input: CreateHazardInput): Promise<Hazard> {
  const formData = new FormData()
  formData.append('type',        input.type)
  formData.append('description', input.description)
  formData.append('severity',    input.severity)
  formData.append('latitude',    String(input.latitude))
  formData.append('longitude',   String(input.longitude))
  formData.append('image',       input.image)   // File object → binary part

  // CRITICAL: delete Content-Type so Axios can set multipart/form-data WITH the
  // boundary string automatically. The api instance defaults to application/json —
  // if that header is present, Multer on the backend cannot parse the file parts.
  const res = await api.post<ApiResponse<{ hazard: Hazard }>>(
    '/hazards',
    formData,
    { headers: { 'Content-Type': undefined } }
  )
  return res.data.data!.hazard
}

// ── verifyHazard ──────────────────────────────────────────────────────
// POST /api/hazards/:id/verify
// Adds the current user's ID to verifiedBy array (server deduplicates).
export async function verifyHazard(hazardId: string): Promise<Hazard> {
  const res = await api.post<ApiResponse<{ hazard: Hazard }>>(
    `/hazards/${hazardId}/verify`
  )
  return res.data.data!.hazard
}

// ── getMyHazards ──────────────────────────────────────────────────────
// GET /api/hazards/mine
// Returns all hazards reported by the logged-in user, newest first.
// Used by the profile page for history and derived stats.
export async function getMyHazards(): Promise<Hazard[]> {
  const res = await api.get<ApiResponse<{ hazards: Hazard[]; count: number }>>(
    '/hazards/mine'
  )
  return res.data.data?.hazards ?? []
}
