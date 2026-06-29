import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import User from '../models/User'
import { AuthPayload, TokenPair } from '../types'

// ── Validation Schemas ────────────────────────────────────────────────
export const RegisterSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase(),
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

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput    = z.infer<typeof LoginSchema>

// ── Token Generation ──────────────────────────────────────────────────
// @types/jsonwebtoken@9 changed expiresIn to a branded 'StringValue' type.
// Casting through 'unknown' then to SignOptions lets us pass env strings safely.
function buildSignOptions(expiresIn: string): SignOptions {
  return { expiresIn: expiresIn as SignOptions['expiresIn'] }
}

export function generateAccessToken(payload: AuthPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured')
  return jwt.sign(payload, secret, buildSignOptions(
    process.env.JWT_ACCESS_EXPIRES_IN || '15m'
  ))
}

export function generateRefreshToken(payload: AuthPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured')
  return jwt.sign(payload, secret, buildSignOptions(
    process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  ))
}

export function generateTokenPair(payload: AuthPayload): TokenPair {
  return {
    accessToken:  generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  }
}

// ── Auth Service ──────────────────────────────────────────────────────
export const authService = {

  async register(input: RegisterInput) {
    const data = RegisterSchema.parse(input)

    const existingUser = await User.findOne({ email: data.email }).lean()
    if (existingUser) {
      const error = new Error('An account with this email already exists.')
      ;(error as any).statusCode = 409
      throw error
    }

    // User.create() triggers the pre-save hook which hashes the password.
    const user = await User.create({
      name:     data.name,
      email:    data.email,
      password: data.password,
    })

    const tokens = generateTokenPair({
      userId: user._id.toString(),
      email:  user.email,
      role:   user.role,
    })

    return { user: user.toJSON(), tokens }
  },

  async login(input: LoginInput) {
    const data = LoginSchema.parse(input)

    // select('+password') overrides the schema's { select: false } on the password field.
    const user = await User.findOne({ email: data.email }).select('+password')

    // Timing-attack prevention: always run bcrypt even when user is not found.
    // This ensures "user not found" and "wrong password" take the same time (~100ms),
    // so an attacker cannot enumerate which emails are registered by measuring response time.
    if (!user) {
      // Run bcrypt against a dummy hash — result is always false and is discarded.
      // The cost (12 rounds) matches production hashing, equalizing response time.
      await bcrypt.compare(
        data.password,
        '$2b$12$invalidhashfortimingequaliz.ationpurposesonly000000'
      )
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

    const tokens = generateTokenPair({
      userId: user._id.toString(),
      email:  user.email,
      role:   user.role,
    })

    return { user: user.toJSON(), tokens }
  },

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const secret = process.env.JWT_REFRESH_SECRET
    if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured')

    let payload: AuthPayload
    try {
      payload = jwt.verify(refreshToken, secret) as AuthPayload
    } catch {
      const error = new Error('Invalid or expired refresh token')
      ;(error as any).statusCode = 401
      throw error
    }

    const user = await User.findById(payload.userId).lean()
    if (!user) {
      const error = new Error('User no longer exists')
      ;(error as any).statusCode = 401
      throw error
    }

    return generateTokenPair({
      userId: user._id.toString(),
      email:  user.email,
      role:   user.role,
    })
  },
}
