import { Router } from 'express'
import { create, getNearby, verify, resolve } from '../controllers/hazardController'
import { authenticate, authorize } from '../middleware/authenticate'
import { uploadSingle } from '../middleware/upload'

const router = Router()

// ── Public routes ─────────────────────────────────────────────────────

// GET /api/hazards/nearby?latitude=...&longitude=...&radius=5000
// No auth required — anyone (including logged-out users) can see hazards.
// This is intentional: hazard alerts are a public safety service.
router.get('/nearby', getNearby)

// ── Authenticated routes ──────────────────────────────────────────────

// POST /api/hazards
// authenticate: verifies JWT, attaches req.user
// uploadSingle:  parses multipart/form-data, attaches req.file
// Order matters: authenticate runs FIRST so we know who is uploading
// before we accept the file. If auth fails, we reject immediately
// without consuming the upload.
router.post('/', authenticate, uploadSingle, create)

// POST /api/hazards/:id/verify
// Any authenticated user can confirm a hazard is real.
router.post('/:id/verify', authenticate, verify)

// ── Moderator-only routes ─────────────────────────────────────────────

// PATCH /api/hazards/:id/resolve
// authorize('moderator', 'admin'): only moderators and admins can resolve hazards.
// This calls next() if authorized, or sends 403 Forbidden if not.
router.patch('/:id/resolve', authenticate, authorize('moderator', 'admin'), resolve)

export default router
