import { Request, Response } from 'express'
import { hazardService } from '../services/hazardService'
import { asyncHandler } from '../utils/asyncHandler'
import { getIO } from '../socket/socketServer'

// ── create ────────────────────────────────────────────────────────────
// POST /api/hazards
// Requires: authenticate middleware (req.user set), uploadSingle middleware (req.file set)
//
// Flow:
//   1. Multer parses multipart/form-data → req.file.buffer + req.body fields
//   2. hazardService.create() validates, uploads to Cloudinary, saves to MongoDB
//   3. Socket.io broadcasts the new hazard to all connected clients
//   4. 201 response with the created hazard
export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error:   'An image is required to report a hazard.',
    })
  }

  const hazard = await hazardService.create(
    {
      type:        req.body.type,
      description: req.body.description,
      severity:    req.body.severity,
      latitude:    req.body.latitude,
      longitude:   req.body.longitude,
    },
    req.file.buffer,     // the image Buffer from Multer's memoryStorage
    req.user!.userId
  )

  // Broadcast to every connected Socket.io client.
  // They receive this event in their useSocket() hook and add the pin to the map.
  // We use getIO() (a getter for the socket server instance) because we can't
  // import `io` directly — it's created after the express app in index.ts.
  try {
    const io = getIO()
    io.emit('hazard:new', hazard)
  } catch {
    // Socket.io not initialized (possible in tests). Non-fatal — log and continue.
    console.warn('Socket.io not available for hazard:new broadcast')
  }

  res.status(201).json({
    success: true,
    message: 'Hazard reported successfully.',
    data:    { hazard },
  })
})

// ── getNearby ─────────────────────────────────────────────────────────
// GET /api/hazards/nearby?latitude=37.77&longitude=-122.41&radius=5000
// Public endpoint — no auth required (anyone can see hazards near them).
export const getNearby = asyncHandler(async (req: Request, res: Response) => {
  const hazards = await hazardService.getNearby({
    latitude:  req.query.latitude  as string,
    longitude: req.query.longitude as string,
    radius:    req.query.radius    as string | undefined,
    limit:     req.query.limit     as string | undefined,
  } as any)

  res.status(200).json({
    success: true,
    data:    { hazards, count: hazards.length },
  })
})

// ── verify ────────────────────────────────────────────────────────────
// POST /api/hazards/:id/verify
// Authenticated users tap "Confirm This Hazard" to add their verification.
export const verify = asyncHandler(async (req: Request, res: Response) => {
  const hazard = await hazardService.verify(req.params.id, req.user!.userId)

  if (!hazard) {
    return res.status(404).json({ success: false, error: 'Hazard not found.' })
  }

  // Broadcast verification count update to all clients.
  try {
    getIO().emit('hazard:verified', {
      hazardId:      hazard._id,
      verifiedCount: hazard.verifiedBy.length,
    })
  } catch {
    // non-fatal
  }

  res.status(200).json({
    success: true,
    data:    { hazard },
  })
})

// ── resolve ───────────────────────────────────────────────────────────
// PATCH /api/hazards/:id/resolve
// Moderators and admins mark a hazard as fixed (removes it from active feed).
export const resolve = asyncHandler(async (req: Request, res: Response) => {
  const hazard = await hazardService.resolve(req.params.id)

  if (!hazard) {
    return res.status(404).json({ success: false, error: 'Hazard not found.' })
  }

  try {
    getIO().emit('hazard:resolved', { hazardId: hazard._id })
  } catch {
    // non-fatal
  }

  res.status(200).json({
    success: true,
    message: 'Hazard marked as resolved.',
    data:    { hazard },
  })
})
