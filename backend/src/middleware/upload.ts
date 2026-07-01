import multer, { FileFilterCallback } from 'multer'
import { Request } from 'express'

// ── Why memoryStorage? ────────────────────────────────────────────────
// Two options in Multer:
//
//   DiskStorage   → writes the file to the local filesystem (/tmp/uploads)
//   MemoryStorage → holds the file as a Buffer in RAM
//
// We use MemoryStorage because:
//   1. We don't want files on disk — we upload straight to Cloudinary.
//   2. Disk storage breaks on multi-server deployments (each server has its own disk).
//   3. After uploading to Cloudinary, there's nothing to clean up.
//
// Tradeoff: large files temporarily occupy RAM.
// The 5MB limit below prevents memory exhaustion.
const storage = multer.memoryStorage()

// ── File filter ───────────────────────────────────────────────────────
// Multer calls this function for every file in the request.
// If we call cb(null, true) → file is accepted.
// If we call cb(null, false) or cb(error) → file is rejected.
//
// We only accept image MIME types. This is a first line of defense —
// Cloudinary also validates on its end, but we validate early to avoid
// sending garbage bytes across the network.
function imageFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Use JPEG, PNG, or WebP.`))
  }
}

// ── Multer instance ───────────────────────────────────────────────────
// .single('image') means: parse one file from the field named 'image'.
// This matches the FormData key we use in the frontend:
//   formData.append('image', file)
//
// limits.fileSize: 5MB in bytes (5 * 1024 * 1024).
// Multer rejects the upload immediately if the file exceeds this —
// no need to buffer the whole thing first.
export const uploadSingle = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
}).single('image')
