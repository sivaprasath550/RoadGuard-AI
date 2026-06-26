// authRouter.ts — maps HTTP methods + paths to controller functions.
//
// The Router is Express's way of grouping related routes.
// We mount this at '/api/auth' in app.ts:
//   app.use('/api/auth', authRouter)
//
// So router.post('/login') becomes POST /api/auth/login
// And router.get('/me')    becomes GET  /api/auth/me
//
// ROUTE TABLE (what the frontend will call):
// ─────────────────────────────────────────────────────────────────────
// POST   /api/auth/register   → Create account
// POST   /api/auth/login      → Create session (set cookies)
// POST   /api/auth/logout     → Destroy session (clear cookies)
// POST   /api/auth/refresh    → Get new access token using refresh token
// GET    /api/auth/me         → Get current user (requires auth)
// ─────────────────────────────────────────────────────────────────────

import { Router } from 'express'
import { authController } from '../controllers/authController'
import { authenticate } from '../middleware/authenticate'

const authRouter = Router()

// Public routes — no authentication needed
authRouter.post('/register', authController.register)
authRouter.post('/login',    authController.login)
authRouter.post('/logout',   authController.logout)
authRouter.post('/refresh',  authController.refresh)

// Protected route — authenticate middleware runs first
// If authenticate fails → 401 response, controller never runs
// If authenticate succeeds → req.user is set, controller runs
authRouter.get('/me', authenticate, authController.me)

export default authRouter
