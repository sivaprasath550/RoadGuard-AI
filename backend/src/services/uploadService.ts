import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadResult {
  url:      string
  publicId: string
}

// ── Internal: raw upload ──────────────────────────────────────────────
// This function may throw Cloudinary-specific errors that contain API keys,
// account names, and internal details. It must NEVER be called directly
// from controllers — use uploadImage() below which sanitises errors.
async function uploadToCloudinary(buffer: Buffer, folder: string): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        format:          'webp',
        transformation:  [
          { width: 1200, crop: 'limit' },
          { quality: 'auto:good' },
        ],
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary returned empty result'))
          return
        }
        resolve({ url: result.secure_url, publicId: result.public_id })
      }
    )

    const { Readable } = require('stream')
    Readable.from(buffer).pipe(uploadStream)
  })
}

// ── Public: sanitised upload ──────────────────────────────────────────
// WHY sanitise errors?
// Cloudinary errors contain your API key, cloud name, and error codes.
// Letting those reach the HTTP response is an information-leakage risk
// (OWASP A05 — Security Misconfiguration). We log the real error server-side
// for debugging, but send only a generic message to the client.
export async function uploadImage(
  buffer: Buffer,
  folder = 'roadguard/hazards'
): Promise<UploadResult> {
  try {
    return await uploadToCloudinary(buffer, folder)
  } catch (err: any) {
    // Log full details server-side — ops team can see this in the console/log drain
    console.error('[Cloudinary] upload failed:', err?.message ?? err)

    // Throw a clean error — this is what reaches the HTTP response
    const sanitised = new Error('Image upload failed. Please try again.')
    ;(sanitised as any).statusCode = 502
    throw sanitised
  }
}

// ── Delete ────────────────────────────────────────────────────────────
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (err: any) {
    console.error('[Cloudinary] delete failed:', err?.message ?? err)
    // Deletion failure is non-fatal — log it but don't crash the request
  }
}
