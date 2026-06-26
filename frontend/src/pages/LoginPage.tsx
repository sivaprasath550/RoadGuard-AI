// LoginPage.tsx — the full login form with validation, error handling, and animation.
//
// FORM STATE STRATEGY:
// We use React's useState for form fields — this is "uncontrolled-ish" state.
// We do NOT use React Query for form state (that's for server state).
// We do NOT use Zustand for form state (that's for global app state).
// Local form state stays local — it doesn't need to be shared.
//
// EXECUTION FLOW when user clicks "Sign In":
// 1. onClick fires → handleSubmit() called
// 2. Client-side validation runs (are fields empty? email format?)
// 3. If invalid: set local error state → component re-renders with red text
// 4. If valid: loginMutation.mutate({ email, password })
// 5. useLogin() calls authApi.login() → Axios POST /api/auth/login
// 6. Server validates → returns 200 + sets HttpOnly cookies
// 7. onSuccess: setUser(user) in Zustand → navigate('/map')
// 8. If server error: loginMutation.error is set → error shown under form

import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react'
import { useLogin } from '../hooks/useAuth'
import { ApiError } from '../types'

export default function LoginPage() {
  // ── Local Form State ────────────────────────────────────────────────
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  // ── Mutation ─────────────────────────────────────────────────────────
  // loginMutation.isPending = true while the HTTP request is in-flight
  // loginMutation.error     = the AxiosError if the request failed
  // loginMutation.mutate()  = call this to trigger the login
  const loginMutation = useLogin()

  // ── Client-Side Validation ───────────────────────────────────────────
  // WHY validate on the client if the server also validates?
  // UX: instant feedback without a round-trip to the server.
  // Security: server validation is the real guard. Client validation is UX only.
  function validate(): boolean {
    const errors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Enter a valid email address'
    }

    if (!password) {
      errors.password = 'Password is required'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0  // true = no errors = valid
  }

  function handleSubmit(e: FormEvent) {
    // Prevent the browser's default form submission (which would reload the page).
    // We handle submission ourselves with JavaScript.
    e.preventDefault()

    if (!validate()) return

    loginMutation.mutate({ email, password })
  }

  // Extract server error message from the Axios error structure
  const serverError = loginMutation.error
    ? ((loginMutation.error as ApiError).response?.data?.error || 'Login failed. Try again.')
    : null

  return (
    // Framer Motion: animate the entire page fading in from slightly below
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-road-dark flex items-center justify-center px-4"
    >
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-road-accent/10 border border-road-accent/20 mb-4">
            <Shield className="w-8 h-8 text-road-accent" />
          </div>
          <h1 className="text-3xl font-bold text-road-text">RoadGuard AI</h1>
          <p className="text-road-muted mt-2 text-sm">Sign in to keep roads safe</p>
        </div>

        {/* Card */}
        <div className="bg-road-surface border border-road-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-road-text mb-6">Welcome back</h2>

          {/* Server Error Banner */}
          {serverError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{serverError}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-road-text mb-2">
                Email address
              </label>
              <div className="relative">
                {/* Icon inside the input */}
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-road-muted" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    // Clear the field error as soon as user starts typing
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }))
                  }}
                  placeholder="you@example.com"
                  className={`
                    w-full pl-10 pr-4 py-3 rounded-xl text-sm
                    bg-road-darker border text-road-text placeholder:text-road-muted
                    transition-colors duration-200 outline-none
                    focus:border-road-accent
                    ${fieldErrors.email ? 'border-red-500' : 'border-road-border'}
                  `}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-road-text mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-road-muted" />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }))
                  }}
                  placeholder="••••••••"
                  className={`
                    w-full pl-10 pr-12 py-3 rounded-xl text-sm
                    bg-road-darker border text-road-text placeholder:text-road-muted
                    transition-colors duration-200 outline-none
                    focus:border-road-accent
                    ${fieldErrors.password ? 'border-red-500' : 'border-road-border'}
                  `}
                />
                {/* Toggle password visibility */}
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-road-muted hover:text-road-text transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="
                w-full py-3 rounded-xl font-semibold text-sm
                bg-road-accent hover:bg-road-accent-hover
                text-white transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                active:scale-[0.98]
              "
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  {/* Inline spinner */}
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-road-muted text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-road-accent hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </motion.div>
  )
}
