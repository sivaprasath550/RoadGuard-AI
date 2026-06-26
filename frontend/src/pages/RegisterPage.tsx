// RegisterPage.tsx — Registration form with password strength indicator.

import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, Shield, CheckCircle } from 'lucide-react'
import { useRegister } from '../hooks/useAuth'
import { ApiError } from '../types'

// Password strength checker — returns 0-4 score and label
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }

  let score = 0
  if (password.length >= 8)             score++
  if (/[A-Z]/.test(password))          score++
  if (/[0-9]/.test(password))          score++
  if (/[^A-Za-z0-9]/.test(password))   score++

  const levels = [
    { label: 'Too short',  color: 'bg-red-500' },
    { label: 'Weak',       color: 'bg-red-500' },
    { label: 'Fair',       color: 'bg-amber-500' },
    { label: 'Good',       color: 'bg-blue-500' },
    { label: 'Strong',     color: 'bg-emerald-500' },
  ]

  return { score, ...levels[score] }
}

export default function RegisterPage() {
  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string; email?: string; password?: string
  }>({})

  const registerMutation = useRegister()
  const strength = getPasswordStrength(password)

  function validate(): boolean {
    const errors: { name?: string; email?: string; password?: string } = {}

    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters'
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Enter a valid email address'
    }
    if (!password || password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password = 'Must include uppercase, lowercase, and a number'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    registerMutation.mutate({ name: name.trim(), email, password })
  }

  const serverError = registerMutation.error
    ? ((registerMutation.error as ApiError).response?.data?.error || 'Registration failed.')
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-road-dark flex items-center justify-center px-4 py-8"
    >
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-road-accent/10 border border-road-accent/20 mb-4">
            <Shield className="w-8 h-8 text-road-accent" />
          </div>
          <h1 className="text-3xl font-bold text-road-text">RoadGuard AI</h1>
          <p className="text-road-muted mt-2 text-sm">Join the community keeping roads safe</p>
        </div>

        {/* Card */}
        <div className="bg-road-surface border border-road-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-road-text mb-6">Create your account</h2>

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

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-road-text mb-2">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-road-muted" />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (fieldErrors.name) setFieldErrors(p => ({ ...p, name: undefined }))
                  }}
                  placeholder="Sabari Pandian"
                  className={`
                    w-full pl-10 pr-4 py-3 rounded-xl text-sm
                    bg-road-darker border text-road-text placeholder:text-road-muted
                    transition-colors duration-200 outline-none focus:border-road-accent
                    ${fieldErrors.name ? 'border-red-500' : 'border-road-border'}
                  `}
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-road-text mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-road-muted" />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: undefined }))
                  }}
                  placeholder="you@example.com"
                  className={`
                    w-full pl-10 pr-4 py-3 rounded-xl text-sm
                    bg-road-darker border text-road-text placeholder:text-road-muted
                    transition-colors duration-200 outline-none focus:border-road-accent
                    ${fieldErrors.email ? 'border-red-500' : 'border-road-border'}
                  `}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-road-text mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-road-muted" />
                <input
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: undefined }))
                  }}
                  placeholder="••••••••"
                  className={`
                    w-full pl-10 pr-12 py-3 rounded-xl text-sm
                    bg-road-darker border text-road-text placeholder:text-road-muted
                    transition-colors duration-200 outline-none focus:border-road-accent
                    ${fieldErrors.password ? 'border-red-500' : 'border-road-border'}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-road-muted hover:text-road-text transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Bar */}
              {password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= level ? strength.color : 'bg-road-border'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    strength.score <= 1 ? 'text-red-400'
                    : strength.score === 2 ? 'text-amber-400'
                    : strength.score === 3 ? 'text-blue-400'
                    : 'text-emerald-400'
                  }`}>
                    {strength.label}
                  </p>
                </div>
              )}

              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.password}</p>
              )}
            </div>

            {/* Requirements checklist */}
            {password && (
              <ul className="space-y-1">
                {[
                  { label: 'At least 8 characters', met: password.length >= 8 },
                  { label: 'One uppercase letter',  met: /[A-Z]/.test(password) },
                  { label: 'One number',            met: /[0-9]/.test(password) },
                ].map(({ label, met }) => (
                  <li key={label} className={`flex items-center gap-2 text-xs ${met ? 'text-emerald-400' : 'text-road-muted'}`}>
                    <CheckCircle className={`w-3 h-3 ${met ? 'text-emerald-400' : 'text-road-border'}`} />
                    {label}
                  </li>
                ))}
              </ul>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="
                w-full py-3 rounded-xl font-semibold text-sm
                bg-road-accent hover:bg-road-accent-hover
                text-white transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                active:scale-[0.98]
              "
            >
              {registerMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-road-muted text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-road-accent hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  )
}
