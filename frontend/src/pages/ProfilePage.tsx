import { motion } from 'framer-motion'
import { Shield, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import MapSidebar from '../components/map/MapSidebar'
import { useAuthStore } from '../store/authStore'
import { useMyHazards } from '../hooks/useHazards'
import { HAZARD_META } from '../types'
import type { Hazard, HazardSeverity } from '../types'
import { timeAgo } from '../utils/geo'

// ── Helpers ────────────────────────────────────────────────────────────

// Hash the user's name to a stable color — same name always gets the
// same color. Math.random() would change it on every render.
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-rose-500',  'bg-amber-500',  'bg-cyan-500',
]
function nameToColor(name: string): string {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

const ROLE_BADGE: Record<string, string> = {
  user:      'bg-road-border    text-road-muted  border-road-border',
  moderator: 'bg-road-accent/10 text-road-accent border-road-accent/30',
  admin:     'bg-violet-500/10  text-violet-400  border-violet-500/30',
}

const SEVERITY_DOT: Record<HazardSeverity, string> = {
  low:    'bg-road-success',
  medium: 'bg-road-warning',
  high:   'bg-road-danger',
}

// ── StatCard ───────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon }: {
  label: string
  value: number
  icon:  React.ElementType
}) {
  return (
    <div className="flex-1 bg-road-surface border border-road-border rounded-2xl
                    px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-road-accent/10 border border-road-accent/20
                      flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-road-accent" />
      </div>
      <div>
        <p className="text-road-text font-bold text-2xl leading-none">{value}</p>
        <p className="text-road-muted text-xs mt-1">{label}</p>
      </div>
    </div>
  )
}

// ── HazardRow ──────────────────────────────────────────────────────────
function HazardRow({ hazard }: { hazard: Hazard }) {
  const meta      = HAZARD_META[hazard.type]
  const isActive  = hazard.status === 'active'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0  }}
      className="flex items-center gap-3 py-3 border-b border-road-border last:border-0"
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-road-border">
        <img
          src={hazard.imageUrl}
          alt={meta.label}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm">{meta.emoji}</span>
          <span className="text-road-text text-sm font-medium">{meta.label}</span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[hazard.severity]}`} />
        </div>
        <p className="text-road-muted text-xs truncate">{hazard.description}</p>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border
          ${isActive
            ? 'text-road-success bg-road-success/10 border-road-success/30'
            : 'text-road-muted  bg-road-border/50   border-road-border'
          }`}>
          {isActive ? 'Active' : 'Resolved'}
        </span>
        <div className="flex items-center gap-2 text-[10px] text-road-muted">
          <span className="flex items-center gap-0.5">
            <CheckCircle className="w-2.5 h-2.5" />
            {hazard.verifiedBy.length}
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {timeAgo(hazard.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-road-border animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-road-border shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 bg-road-border rounded" />
        <div className="h-3 w-48 bg-road-border rounded" />
      </div>
      <div className="w-14 h-5 bg-road-border rounded-full" />
    </div>
  )
}

// ── ProfilePage ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user } = useAuthStore()
  const { data: myHazards = [], isLoading } = useMyHazards()

  // Derive stats from the fetched list — no separate endpoint needed
  const totalVerificationsReceived = myHazards.reduce(
    (sum, h) => sum + h.verifiedBy.length, 0
  )

  const initial   = user?.name?.[0]?.toUpperCase() ?? '?'
  const avatarBg  = user?.name ? nameToColor(user.name) : 'bg-road-accent'
  const roleBadge = ROLE_BADGE[user?.role ?? 'user']

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-road-dark">
      <MapSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-road-border bg-road-darker/50">
          <h1 className="text-road-text font-bold text-xl mb-0.5">Profile</h1>
          <p className="text-road-muted text-sm">Your account and report history</p>
        </div>

        {/* ── Scrollable content ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ── Identity card ──────────────────────────────────── */}
          <div className="bg-road-surface border border-road-border rounded-2xl p-5
                          flex items-center gap-5">
            {/* Avatar */}
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-road-border shrink-0"
              />
            ) : (
              <div className={`w-16 h-16 rounded-2xl ${avatarBg} shrink-0
                              flex items-center justify-center`}>
                <span className="text-white text-2xl font-bold">{initial}</span>
              </div>
            )}

            {/* Name + email + role */}
            <div className="min-w-0">
              <h2 className="text-road-text font-bold text-lg leading-tight truncate">
                {user?.name ?? '—'}
              </h2>
              <p className="text-road-muted text-sm truncate mb-2">
                {user?.email ?? '—'}
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider
                                  px-2.5 py-1 rounded-full border ${roleBadge}`}>
                  {user?.role ?? 'user'}
                </span>
                {user?.isVerified && (
                  <span className="flex items-center gap-1 text-[10px] font-medium
                                   text-road-accent">
                    <Shield className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Stats row ──────────────────────────────────────── */}
          <div className="flex gap-4">
            <StatCard
              label="Hazards Reported"
              value={myHazards.length}
              icon={AlertTriangle}
            />
            <StatCard
              label="Verifications Received"
              value={totalVerificationsReceived}
              icon={CheckCircle}
            />
          </div>

          {/* ── My Reports list ────────────────────────────────── */}
          <div className="bg-road-surface border border-road-border rounded-2xl p-5">
            <h3 className="text-road-text font-semibold text-sm mb-4">My Reports</h3>

            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : myHazards.length === 0 ? (
              <div className="py-10 text-center">
                <span className="text-4xl block mb-3">📍</span>
                <p className="text-road-text font-medium text-sm mb-1">No reports yet</p>
                <p className="text-road-muted text-xs">
                  Reports you submit appear here with their status and verifications.
                </p>
              </div>
            ) : (
              myHazards.map(hazard => (
                <HazardRow key={hazard._id} hazard={hazard} />
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
