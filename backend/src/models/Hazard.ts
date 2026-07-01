import mongoose, { Schema, Document, Model } from 'mongoose'

// ── Hazard Types ──────────────────────────────────────────────────────
// These are the categories a user can select when reporting.
// Using a TypeScript union + Mongoose enum keeps both layers in sync.
export type HazardType =
  | 'pothole'
  | 'flooding'
  | 'fallen_tree'
  | 'construction'
  | 'accident'

export type HazardSeverity = 'low' | 'medium' | 'high'
export type HazardStatus   = 'active' | 'resolved'

// ── TypeScript Interface ──────────────────────────────────────────────
// IHazard describes the shape of a Hazard document in TypeScript.
// Every field here maps 1-to-1 with the Mongoose schema below.
export interface IHazard extends Document {
  type:        HazardType
  description: string
  severity:    HazardSeverity
  status:      HazardStatus

  // GeoJSON Point — the exact GPS coordinate of the hazard.
  // MongoDB requires this shape to use 2dsphere geospatial queries.
  // IMPORTANT: coordinates are [longitude, latitude] — NOT [lat, lng].
  // This is the #1 geospatial bug: GeoJSON and Leaflet use opposite order.
  location: {
    type:        'Point'
    coordinates: [number, number]  // [longitude, latitude]
  }

  imageUrl:   string                          // Cloudinary HTTPS URL
  reportedBy: mongoose.Types.ObjectId         // ref: User who created this
  verifiedBy: mongoose.Types.ObjectId[]       // ref: Users who confirmed it

  createdAt: Date
  updatedAt: Date
}

// ── Schema ────────────────────────────────────────────────────────────
const HazardSchema = new Schema<IHazard>(
  {
    type: {
      type:     String,
      required: [true, 'Hazard type is required'],
      enum:     ['pothole', 'flooding', 'fallen_tree', 'construction', 'accident'],
    },

    description: {
      type:      String,
      required:  [true, 'Description is required'],
      trim:      true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    severity: {
      type:    String,
      enum:    ['low', 'medium', 'high'],
      default: 'medium',
    },

    status: {
      type:    String,
      enum:    ['active', 'resolved'],
      default: 'active',
    },

    // GeoJSON Point sub-document.
    // The nested 'type' field must also be typed as String with enum: ['Point'].
    // MongoDB uses the 'type' string to know which geospatial shape this is.
    location: {
      type: {
        type:    String,
        enum:    ['Point'],
        default: 'Point',
      },
      coordinates: {
        type:     [Number],
        required: true,
      },
    },

    imageUrl: {
      type:     String,
      required: [true, 'Image is required'],
    },

    // ObjectId reference to the User who created this hazard.
    // mongoose.Schema.Types.ObjectId is the correct type for references.
    // ref: 'User' enables .populate('reportedBy') to join the user document.
    reportedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    // Array of ObjectId references — users who confirmed this hazard is real.
    // $addToSet prevents the same user from being added twice (server-side dedup).
    verifiedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'User',
      },
    ],
  },
  {
    timestamps: true,

    toJSON: {
      transform(_doc: any, ret: any) {
        delete ret.__v
        return ret
      },
    },
  }
)

// ── Indexes ───────────────────────────────────────────────────────────
// 2dsphere: required for $near, $nearSphere, $geoWithin queries.
// Without this, MongoDB throws: "unable to find index for $geoNear query"
HazardSchema.index({ location: '2dsphere' })

// Compound index: status + location.
// When querying active hazards near a point, MongoDB can use this index
// to filter by status AND apply the geospatial search efficiently.
HazardSchema.index({ status: 1, location: '2dsphere' })

// Allows fast lookup of "all hazards reported by this user."
HazardSchema.index({ reportedBy: 1 })

// ── Model ─────────────────────────────────────────────────────────────
const Hazard: Model<IHazard> =
  (mongoose.models.Hazard as Model<IHazard>) ||
  mongoose.model<IHazard>('Hazard', HazardSchema)

export default Hazard
