import { v2 as cloudinary } from 'cloudinary'

// ── Cloudinary configuration ──────────────────────────────────────────
// We call config() once at module load time.
// Cloudinary's SDK reads these values from process.env automatically
// when you call config() — you don't need to pass them explicitly.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ── Upload result shape ───────────────────────────────────────────────
export interface UploadResult {
  url:      string  // Cloudinary secure HTTPS URL
  publicId: string  // Cloudinary asset ID (needed for deletion)
}

// ── uploadImage ───────────────────────────────────────────────────────
// Takes a Buffer (from Multer's memoryStorage) and uploads it to Cloudinary.
//
// WHY use upload_stream instead of upload()?
// cloudinary.upload() only accepts file paths (strings).
// We have a Buffer in memory, not a file on disk.
// upload_stream accepts a Node.js Readable stream — we create one from the Buffer.
//
// HOW streams work here:
//   Buffer.from(buffer) → Readable stream → pipe into cloudinary.upload_stream
//   Cloudinary reads the stream, uploads to CDN, calls the callback with result.
export async function uploadImage(buffer: Buffer, folder = 'roadguard/hazards'): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    // upload_stream returns a writable stream.
    // We pipe our Buffer into it.
    // The callback fires when the upload is complete (or fails).
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,

        // Cloudinary auto-converts uploaded images to WebP.
        // WebP is ~30% smaller than JPEG at the same quality.
        // This saves bandwidth and storage without any quality loss.
        format: 'webp',

        // Resize to max 1200px wide if larger.
        // Phone photos can be 4000+ pixels wide — we don't need that.
        // Cloudinary handles the resize server-side.
        transformation: [
          { width: 1200, crop: 'limit' },
          { quality: 'auto:good' },           // Smart compression
        ],

        // resource_type: 'image' is the default, but being explicit
        // prevents HEIC/HEIF mobile formats from being rejected.
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload returned empty result'))
          return
        }
        resolve({
          url:      result.secure_url,
          publicId: result.public_id,
        })
      }
    )

    // Convert Buffer to a Readable stream and pipe into Cloudinary's writable stream.
    // This is the standard Node.js pattern for streaming in-memory data.
    const { Readable } = require('stream')
    Readable.from(buffer).pipe(uploadStream)
  })
}

// ── deleteImage ───────────────────────────────────────────────────────
// Deletes an image from Cloudinary by its publicId.
// Called when a hazard report is deleted — we clean up the asset too.
// Without this, orphaned images accumulate and you pay for storage.
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}
