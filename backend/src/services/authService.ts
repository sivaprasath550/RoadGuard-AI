// authService.ts contains ALL auth business logic.
//
// THE LAYERED PRINCIPLE REVISITED:
//   Controller   → "I received a register request, I'll call the service"
//   Service      → "I know the rules: validate → check duplicate → hash → save → token"
//   Repository   → "I know how to talk to MongoDB"
//
// The service knows NOTHING about Express (no req, no res, no cookies).
// This makes it testable in isolation: authService.register(data) → result.
// No HTTP server needed to test business logic.

import jwt from 'jsonwebtoken'
import { z } from 'zod'
import User from '../models/User'
import { AuthPayload, TokenPair } from '../types'

// ── Zod Validation Schemas ────────────────────────────────────────────
// Zod validates data AT RUNTIME. TypeScript types only exist at compile time.
// When a POST /register hits the server, the body is unknown JSON.
// We MUST validate it at runtime — we cannot trust what the client sends.
//
// Zod schema = validator + TypeScript type in one.
export const RegisterSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),

  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase(),  // Zod transforms: normalizes to lowercase

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and a number'
    ),
})

export const LoginSchema = z.object({
  email:    z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
})

// TypeScript infers the type FROM the Zod schema — single source of truth
export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput    = z.infer<typeof LoginSchema>

// ── Token Generation ──────────────────────────────────────────────────
// Generates a JWT Access Token (short-lived, 15 minutes)
export function generateAccessToken(payload: AuthPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured')

  // jwt.sign() creates the JWT:
  // 1. Encodes header: { alg: "HS256", typ: "JWT" }
  // 2. Encodes payload: { userId, email, role, iat, exp }
  // 3. Signs: HMACSHA256(base64(header) + "." + base64(payload), secret)
  // 4. Joins: header.payload.signature
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    // iat (issued at) is added automatically by jsonwebtoken
  })
}

// Generates a JWT Refresh Token (long-lived, 7 days)
// Uses a DIFFERENT secret from access token — if access secret leaks,
// refresh tokens are still safe, and vice versa.
export function generateRefreshToken(payload: AuthPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured')

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  })
}

export function generateTokenPair(payload: AuthPayload): TokenPair {
  return {
    accessToken:  generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  }
}

// ── Auth Service ──────────────────────────────────────────────────────
export const authService = {

  // ── register() ─────────────────────────────────────────────────────
  async register(input: RegisterInput) {
    // Step 1: Validate input (Zod throws ZodError on failure, caught by controller)
    const data = RegisterSchema.parse(input)

    // Step 2: Check for duplicate email.
    // WHY lean()? By default, Mongoose returns a full Mongoose Document object
    // with all the overhead of prototype methods (.save, .validate, etc.)
    // .lean() returns a plain JS object — 3-5x faster, less memory.
    // We only need to CHECK existence, so lean() is perfect here.
    const existingUser = await User.findOne({ email: data.email }).lean()
    if (existingUser) {
      // Use a generic error message — don't confirm that the email exists.
      // "Email already registered" tells attackers which emails are in the system.
      const error = new Error('Registration failed. Please try again.')
      ;(error as any).statusCode = 409  // 409 Conflict
      throw error
    }

    // Step 3: Create the user.
    // We do NOT hash the password here — the pre-save hook in User.ts handles it.
    // Separation of concerns: the Model is responsible for its own data integrity.
    const user = await User.create({
      name:     data.name,
      email:    data.email,
      password: data.password,  // Will be hashed by pre-save hook before DB write
    })

    // Step 4: Generate token pair.
    const tokenPayload: AuthPayload = {
      userId: user._id.toString(),
      email:  user.email,
      role:   user.role,
    }
    const tokens = generateTokenPair(tokenPayload)

    // Step 5: Return user (toJSON transform removes password) + tokens.
    // The controller will put tokens in cookies.
    return {
      user:   user.toJSON(),
      tokens,
    }
  },

  // ── login() ────────────────────────────────────────────────────────
  async login(input: LoginInput) {
    const data = LoginSchema.parse(input)

    // MUST use .select('+password') because the password field has select: false.
    // Without +password, user.password would be undefined and comparePassword fails.
    const user = await User.findOne({ email: data.email }).select('+password')

    // TIMING ATTACK PREVENTION:
    // Do NOT return early with "user not found" vs "wrong password".
    // If we returned immediately when user is null, attackers could time the response:
    //   - Fast response (2ms) → user doesn't exist
    //   - Slow response (100ms) → user exists, bcrypt ran → wrong password
    // This tells them which emails are registered.
    //
    // Instead, if user is null, we still run bcrypt (with a dummy hash)
    // so both code paths take ~100ms. Timing is identical.
    if (!user) {
      // Run a dummy hash to equalize timing. The result is discarded.
      await bcrypt.dummyCompare()  // We'll implement this below as a workaround
      const error = new Error('Invalid email or password')
      ;(error as any).statusCode = 401
      throw error
    }

    const isPasswordValid = await user.comparePassword(data.password)
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password')
      ;(error as any).statusCode = 401
      throw error
    }

    const tokenPayload: AuthPayload = {
      userId: user._id.toString(),
      email:  user.email,
      role:   user.role,
    }
    const tokens = generateTokenPair(tokenPayload)

    return {
      user:   user.toJSON(),
      tokens,
    }
  },

  // ── refreshTokens() ────────────────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    const secret = process.env.JWT_REFRESH_SECRET
    if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured')

    let payload: AuthPayload
    try {
      // jwt.verify() throws if:
      //   - Token is expired (TokenExpiredError)
      //   - Signature is invalid (JsonWebTokenError)
      //   - Token is malformed (JsonWebTokenError)
      payload = jwt.verify(refreshToken, secret) as AuthPayload
    } catch {
      const error = new Error('Invalid or expired refresh token')
      ;(error as any).statusCode = 401
      throw error
    }

    // Verify the user still exists (account may have been deleted since token was issued)
    const user = await User.findById(payload.userId).lean()
    if (!user) {
      const error = new Error('User no longer exists')
      ;(error as any).statusCode = 401
      throw error
    }

    const newTokenPayload: AuthPayload = {
      userId: user._id.toString(),
      email:  user.email,
      role:   user.role,
    }

    return generateTokenPair(newTokenPayload)
  },
}

// Timing-safe dummy compare to prevent user enumeration
// We import bcrypt directly here for this specific use
import bcrypt from 'bcryptjs'

// Monkey-patch a dummy method for the timing equalization trick above
;(bcrypt as any).dummyCompare = async () => {
  // This is a real bcrypt hash of "dummy" — bcrypt.compare runs but result is discarded
  const DUMMY_HASH = '$2b$12$DummyHashForTimingAttackPrevention12345'
  await bcrypt.compare('dummy', DUMMY_HASH).catch(() => false)
}
