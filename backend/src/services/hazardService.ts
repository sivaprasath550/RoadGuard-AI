import { z } from 'zod'
import Hazard, { IHazard } from '../models/Hazard'
import { uploadImage } from './uploadService'

// ── Validation Schemas ────────────────────────────────────────────────

// CreateHazardSchema validates what comes from the form submission.
// Note: latitude and longitude arrive as STRINGS from multipart/form-data.
// FormData always sends non-file fields as strings — even numbers.
// z.coerce.number() converts "37.7749" (string) → 37.7749 (number).
// Without coerce, z.number() would reject the string and cause a 400 error.
export const CreateHazardSchema = z.object({
  type: z.enum(
    ['pothole', 'flooding', 'fallen_tree', 'construction', 'accident'],
    { required_error: 'Hazard type is required' }
  ),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description cannot exceed 500 characters'),
  severity: z
    .enum(['low', 'medium', 'high'])
    .optional()
    .default('medium'),
  latitude: z.coerce
    .number({ invalid_type_error: 'Latitude must be a number' })
    .min(-90)
    .max(90),
  longitude: z.coerce
    .number({ invalid_type_error: 'Longitude must be a number' })
    .min(-180)
    .max(180),
})

// NearbySchema validates the GET /hazards/nearby query parameters.
// These also arrive as strings in URL query strings: ?lat=37.77&lng=-122.41
export const NearbySchema = z.object({
  latitude:  z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius:    z.coerce.number().min(100).max(50000).optional().default(5000),
  limit:     z.coerce.number().min(1).max(100).optional().default(50),
})

export type CreateHazardInput = z.infer<typeof CreateHazardSchema>
export type NearbyInput       = z.infer<typeof NearbySchema>

// ── Hazard Service ────────────────────────────────────────────────────
export const hazardService = {

  async create(
    input: CreateHazardInput,
    imageBuffer: Buffer,
    userId: string
  ): Promise<IHazard> {
    const data = CreateHazardSchema.parse(input)

    // Upload photo to Cloudinary BEFORE creating the DB document.
    // Why? If we create the DB doc first and the upload fails, we have
    // an orphaned document with no imageUrl. Always do the expensive
    // external operation first — roll back is easier on success.
    const { url: imageUrl } = await uploadImage(imageBuffer)

    // CRITICAL: GeoJSON coordinates are [longitude, latitude].
    // We receive lat/lng from the client but must swap them for MongoDB.
    const hazard = await Hazard.create({
      type:        data.type,
      description: data.description,
      severity:    data.severity,
      location: {
        type:        'Point',
        coordinates: [data.longitude, data.latitude],  // [lng, lat] — GeoJSON order
      },
      imageUrl,
      reportedBy: userId,
      verifiedBy: [],
    })

    return hazard
  },

  // getNearby uses MongoDB's $near operator to find active hazards
  // within `radius` meters of the given coordinate, sorted nearest-first.
  //
  // .populate('reportedBy', 'name avatar') — replaces the ObjectId with
  // the actual User document fields we need for display.
  // We only select 'name' and 'avatar' — never expose the full user object.
  async getNearby(input: NearbyInput): Promise<IHazard[]> {
    const data = NearbySchema.parse(input)

    const hazards = await Hazard.find({
      status: 'active',
      location: {
        $near: {
          $geometry: {
            type:        'Point',
            coordinates: [data.longitude, data.latitude],  // [lng, lat]
          },
          $maxDistance: data.radius,
        },
      },
    })
      .limit(data.limit)
      .populate('reportedBy', 'name avatar')
      .lean()

    // .lean() returns FlattenMaps<IHazard> (a raw POJO without Mongoose Document
    // methods). At runtime the shape is identical to IHazard, but TypeScript's
    // structural checker disagrees on internal Mongoose client types — hence the
    // double cast. We own the query above so the assertion is safe.
    return hazards as unknown as IHazard[]
  },

  // verify adds userId to the verifiedBy array, but only if not already present.
  // $addToSet is MongoDB's atomic "add only if unique" operator.
  // This is safer than checking first and then updating — avoids race conditions.
  async verify(hazardId: string, userId: string): Promise<IHazard | null> {
    const hazard = await Hazard.findByIdAndUpdate(
      hazardId,
      { $addToSet: { verifiedBy: userId } },
      { new: true }   // return the UPDATED document, not the original
    )
    return hazard
  },

  // resolve marks a hazard as fixed. Only moderators/admins can do this —
  // enforced via the authorize() middleware in the route, not here.
  async resolve(hazardId: string): Promise<IHazard | null> {
    return Hazard.findByIdAndUpdate(
      hazardId,
      { status: 'resolved' },
      { new: true }
    )
  },

  async getById(hazardId: string): Promise<IHazard | null> {
    return Hazard.findById(hazardId).populate('reportedBy', 'name avatar')
  },
}
