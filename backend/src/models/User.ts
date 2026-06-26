// User.ts defines the Mongoose schema — the shape of a User document in MongoDB.
//
// HOW MONGOOSE SCHEMAS WORK:
// 1. You define a Schema — describes the shape, types, and validation rules
// 2. You create a Model from the Schema — the Model is what you query against
// 3. Model.find(), Model.create(), Model.findById() — these hit MongoDB
//
// BSON vs JSON:
// MongoDB stores documents as BSON (Binary JSON).
// BSON supports types JSON doesn't: ObjectId, Date, Binary, Decimal128.
// Mongoose handles the BSON ↔ JS object conversion automatically.

import mongoose, { Schema, Document, Model } from 'mongoose'
import bcrypt from 'bcryptjs'

// ── TypeScript Interface ──────────────────────────────────────────────
// This interface describes what a User document looks like in TypeScript.
// It extends Document (which adds _id, save(), toJSON(), etc.)
export interface IUser extends Document {
  name:        string
  email:       string
  password:    string
  role:        'user' | 'moderator' | 'admin'
  avatar?:     string
  location?: {
    type:        'Point'
    coordinates: [number, number]  // [longitude, latitude]
  }
  isVerified:  boolean
  createdAt:   Date
  updatedAt:   Date

  // Instance method — callable on a user document: user.comparePassword("abc")
  comparePassword(candidatePassword: string): Promise<boolean>
}

// ── Mongoose Schema ───────────────────────────────────────────────────
const UserSchema = new Schema<IUser>(
  {
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,       // Strips leading/trailing whitespace automatically
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,       // Creates a unique index in MongoDB
      lowercase: true,       // Automatically converts to lowercase before saving
      trim:      true,

      // Mongoose validates email format before saving.
      // This regex is a simplified RFC 5322 check.
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please enter a valid email address',
      ],
    },

    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],

      // CRITICAL: select: false means this field is EXCLUDED from all queries by default.
      // User.find() → returns documents WITHOUT the password field.
      // You must explicitly request it: User.findOne().select('+password')
      // This prevents accidentally sending hashed passwords in API responses.
      select: false,
    },

    role: {
      type:    String,
      enum:    ['user', 'moderator', 'admin'],  // Only these values are accepted
      default: 'user',
    },

    avatar: {
      type: String,
      // No required: true — avatar is optional
    },

    // GeoJSON Point for geospatial queries.
    // MongoDB requires this exact structure to use 2dsphere indexes.
    location: {
      type: {
        type:    String,
        enum:    ['Point'],  // Only 'Point' is allowed — GeoJSON spec
        default: 'Point',
      },
      coordinates: {
        type:    [Number],   // Array of two numbers: [longitude, latitude]
        default: [0, 0],     // Default: null island (0°N 0°E) — will be updated on first GPS
      },
    },

    isVerified: {
      type:    Boolean,
      default: false,
    },
  },
  {
    // timestamps: true automatically adds createdAt and updatedAt fields.
    // Mongoose updates updatedAt on every .save() call.
    timestamps: true,

    // toJSON transform: controls what happens when you call res.json(user)
    // We use it to remove sensitive/internal fields from API responses.
    toJSON: {
      transform(_doc, ret) {
        delete ret.password    // Never send password hash in responses
        delete ret.__v         // Remove Mongoose's internal version key
        return ret
      },
    },
  }
)

// ── Indexes ───────────────────────────────────────────────────────────
// The unique: true on email creates a B-tree index automatically.
// We explicitly create the 2dsphere index for geospatial queries:
//
// 2dsphere index uses a spherical earth model (not flat).
// This means distance calculations account for Earth's curvature.
// Required for: $near, $nearSphere, $geoWithin, $geoIntersects queries.
UserSchema.index({ location: '2dsphere' })

// ── Pre-save Hook (Middleware) ────────────────────────────────────────
// Mongoose middleware — runs BEFORE every .save() call.
// This is where we hash the password.
//
// WHY HERE instead of in the service?
// Defense in depth. Even if a developer forgets to hash in the service layer,
// the model ALWAYS hashes before saving. The password is NEVER stored plain.
//
// We use a regular function (not arrow) because:
// Arrow functions don't have their own 'this'.
// Here, 'this' refers to the document being saved — we need that.
UserSchema.pre('save', async function (next) {
  // Only hash if the password field was actually changed.
  // If user updates their name, we don't re-hash the password unnecessarily.
  // isModified() returns true on first save (new document) OR when password is changed.
  if (!this.isModified('password')) return next()

  // 12 = cost factor (2^12 = 4,096 iterations)
  // Takes ~100ms — slow enough to deter brute force, fast enough for UX
  this.password = await bcrypt.hash(this.password, 12)

  next()  // Signal Mongoose to continue with the save
})

// ── Instance Method ───────────────────────────────────────────────────
// comparePassword() is called on a user document instance:
//   const user = await User.findOne({ email }).select('+password')
//   const isMatch = await user.comparePassword('inputPassword')
//
// bcrypt.compare internally:
//   1. Extracts salt from the stored hash
//   2. Hashes the candidatePassword with that same salt
//   3. Compares the result to the stored hash in constant time
//      (constant-time comparison prevents timing attacks)
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // 'this.password' is the stored bcrypt hash.
  // bcrypt embeds the salt inside the hash string, so we don't need it separately.
  return bcrypt.compare(candidatePassword, this.password)
}

// ── Create and Export Model ───────────────────────────────────────────
// mongoose.model() registers the model with Mongoose.
// First argument: 'User' — this becomes the collection name 'users' (lowercase + plural)
// Second argument: the Schema
//
// TypeScript generic: Model<IUser> ensures all queries return IUser-typed documents.
//
// The 'mongoose.models.User ||' check prevents:
// "Cannot overwrite `User` model once compiled" error in development
// (ts-node-dev re-imports modules on file change — without this guard, it
// tries to register the model twice and crashes)
const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema)

export default User
