// app.ts creates and configures the Express application.
// We separate app creation (app.ts) from server startup (index.ts)
// so that tests can import the app WITHOUT starting a server.
//
// HOW EXPRESS WORKS — THE MIDDLEWARE CHAIN:
// Every incoming HTTP request passes through middleware functions IN ORDER.
// Each middleware can:
//   1. Read/modify req (request)
//   2. Read/modify res (response)
//   3. Call next() to pass to the next middleware
//   4. Or call res.send() to end the chain
//
// Think of it as an assembly line:
//   Request → [CORS] → [Helmet] → [Parser] → [Logger] → [Routes] → Response

import express, { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import authRouter from './routes/authRouter'
import hazardRouter from './routes/hazardRoutes'

const app = express()

// ── MIDDLEWARE 1: Helmet (Security Headers) ─────────────────────────
// Helmet sets HTTP response headers that protect against common attacks:
//   X-Content-Type-Options: nosniff       → Prevents MIME type sniffing
//   X-Frame-Options: DENY                 → Prevents clickjacking
//   Strict-Transport-Security             → Forces HTTPS
//   Content-Security-Policy              → Controls what resources can load
//   X-XSS-Protection: 0                  → Disables outdated XSS filter
// You should ALWAYS add helmet to any production Express app.
app.use(helmet())

// ── MIDDLEWARE 2: CORS (Cross-Origin Resource Sharing) ──────────────
// The browser enforces the Same-Origin Policy:
// JavaScript on https://roadguard.app cannot fetch from https://api.roadguard.app
// unless the API server explicitly allows it via CORS headers.
//
// When a request is made to a different origin, the browser:
// 1. Sends a "preflight" OPTIONS request: "Can I make this request?"
// 2. Checks the response headers for permission
// 3. If allowed, sends the actual request
//
// Our CORS config:
app.use(cors({
  // Only allow requests from our frontend origin.
  // In production, this would be: 'https://roadguard.vercel.app'
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Allow cookies to be sent with cross-origin requests.
  // Required for HttpOnly cookie auth to work.
  credentials: true,

  // These are the HTTP methods we allow from the frontend.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // These are the request headers the frontend is allowed to send.
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── MIDDLEWARE 3: Rate Limiting ──────────────────────────────────────
// Prevents brute-force attacks, DoS attacks, and API abuse.
// Without this, a bot could send 10,000 login attempts per second.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minute window
  max: 100,                    // Max 100 requests per IP per window
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,       // Send X-RateLimit-* headers
  legacyHeaders: false,
})
app.use('/api', generalLimiter)

// Stricter limit for auth endpoints (protect against credential stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // Only 10 login/register attempts per 15 minutes
  message: { error: 'Too many auth attempts. Please wait.' },
})
app.use('/api/auth', authLimiter)

// ── MIDDLEWARE 4: Body Parsers ───────────────────────────────────────
// Express cannot read req.body by default.
// These parsers parse the raw request body and attach it to req.body.

// Parses JSON bodies: Content-Type: application/json
// Example: {"email": "test@test.com", "password": "123"}
// After this middleware: req.body = { email: 'test@test.com', password: '123' }
app.use(express.json({ limit: '10mb' }))

// Parses URL-encoded bodies: Content-Type: application/x-www-form-urlencoded
// Example: Traditional HTML form submissions
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Parses Cookie header and attaches to req.cookies.
// Example: Cookie: token=eyJhbGc... → req.cookies.token = 'eyJhbGc...'
// Required for reading HttpOnly auth cookies.
app.use(cookieParser())

// ── MIDDLEWARE 5: HTTP Logger ────────────────────────────────────────
// Morgan logs every request to the console.
// "dev" format: "GET /api/hazards 200 45ms"
// In production, you'd use "combined" format and pipe to a log file.
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'))
}

// ── HEALTH CHECK ────────────────────────────────────────────────────
// A simple endpoint that returns 200 OK.
// Used by Docker, Railway, and load balancers to check if the server is alive.
// If this returns anything other than 2xx, the deployment platform restarts the pod.
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),  // Seconds since the process started
    environment: process.env.NODE_ENV,
  })
})

// ── ROUTES ───────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/hazards', hazardRouter)
// app.use('/api/users',   userRouter)    ← Phase 5
// app.use('/api/alerts',  alertRouter)   ← Phase 5

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────────────
// Express's special 4-argument middleware = error handler.
// Any call to next(error) anywhere in the app ends up here.
// This is the LAST middleware — must be registered after all routes.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.stack || err.message)

  const statusCode = err.statusCode || err.status || 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json({
    error: message,
    // Only send stack trace in development — never expose in production
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

export default app
