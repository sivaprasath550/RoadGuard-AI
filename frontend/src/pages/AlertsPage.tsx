import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, CheckCircle, Radio } from 'lucide-react'
import MapSidebar from '../components/map/MapSidebar'
import { useGeolocation } from '../hooks/useGeolocation'
import { useNearbyHazards, useHazardSocket, useVerifyHazard } from '../hooks/useHazards'
import { HAZARD_META } from '../types'
import type { Hazard } from '../types'
import { distanceKm, formatDistance, timeAgo } from '../utils/geo'

const SEVERITY_STYLES = {
  low:    { dot: 'bg-road-success', text: 'text-road-success', label: 'LOW'  },
  medium: { dot: 'bg-road-warning', text: 'text-road-warning', label: 'MED'  },
  high:   { dot: 'bg-road-danger',  text: 'text-road-danger',  label: 'HIGH' },
}

// ── HazardCard ─────────────────────────────────────────────────────────
interface CardProps {
  hazard:      Hazard
  userLat:     number
  userLng:     number
  onVerify:    (id: string) => void
  isVerifying: boolean
}

function HazardCard({ hazard, userLat, userLng, onVerify, isVerifying }: CardProps) {
  const meta     = HAZARD_META[hazard.type]
  const severity = SEVERITY_STYLES[hazard.severity]

  // GeoJSON stores [longitude, latitude] — extract correctly for haversine
  const hazardLat = hazard.location.coordinates[1]
  const hazardLng = hazard.location.coordinates[0]
  const km        = distanceKm(userLat, userLng, hazardLat, hazardLng)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0  }}
      exit={{   opacity: 0, y: -8  }}
      layout
      className="bg-road-surface border border-road-border rounded-2xl p-4
                 hover:border-road-muted transition-colors duration-200"
    >
      {/* Type + severity */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{meta.emoji}</span>
          <span className="text-road-text font-semibold text-sm">{meta.label}</span>
        </div>
        <div className={`flex items-center gap-1.5 ${severity.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${severity.dot}`} />
          <span className="text-[10px] font-bold tracking-wider">{severity.label}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-road-muted text-xs leading-relaxed line-clamp-2 mb-3">
        {hazard.description}
      </p>

      {/* Footer: distance · time-ago · verify */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-road-muted">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            {formatDistance(km)}
          </span>
          <span>{timeAgo(hazard.createdAt)}</span>
        </div>

        <button
          onClick={() => onVerify(hazard._id)}
          disabled={isVerifying}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium
                     bg-road-accent/10 text-road-accent border border-road-accent/20
                     hover:bg-road-accent/20 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-3 h-3" />
          Verify · {hazard.verifiedBy.length}
        </button>
      </div>
    </motion.div>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-road-surface border border-road-border rounded-2xl p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-4 w-24 bg-road-border rounded" />
        <div className="h-4 w-10 bg-road-border rounded" />
      </div>
      <div className="h-3 w-full  bg-road-border rounded mb-1.5" />
      <div className="h-3 w-3/4   bg-road-border rounded mb-3" />
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-road-border rounded" />
        <div className="h-6 w-20 bg-road-border rounded-lg" />
      </div>
    </div>
  )
}

// ── AlertsPage ─────────────────────────────────────────────────────────
export default function AlertsPage() {
  const { position, isLoading: gpsLoading } = useGeolocation()
  const lat = position?.lat ?? 0
  const lng = position?.lng ?? 0

  const { data: hazards = [], isLoading: hazardsLoading } = useNearbyHazards(lat, lng)
  const verifyMutation = useVerifyHazard(lat, lng)

  // Real-time: injects new hazards into the React Query cache via Socket.io
  useHazardSocket(lat, lng)

  // Tick every 30s so timeAgo() strings refresh without a network request.
  // setTick forces a re-render; the tick value itself is never read.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)  // prevents memory leak on unmount
  }, [])

  // Sort newest-first — more useful than nearest-first for an alerts feed.
  // [...hazards] copies the array because React Query's data is read-only.
  const sorted = [...hazards].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const isLoading = gpsLoading || hazardsLoading

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-road-dark">
      <MapSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-road-border bg-road-darker/50">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-road-text font-bold text-xl">Live Alerts</h1>
            {!isLoading && position && (
              <div className="flex items-center gap-1.5 px-2 py-0.5
                              bg-road-danger/10 border border-road-danger/30 rounded-full">
                <Radio className="w-3 h-3 text-road-danger animate-pulse" />
                <span className="text-[10px] font-bold text-road-danger tracking-wider">LIVE</span>
              </div>
            )}
          </div>
          <p className="text-road-muted text-sm">
            {position
              ? `${sorted.length} active hazard${sorted.length !== 1 ? 's' : ''} within 5 km`
              : 'Acquiring your location…'}
          </p>
        </div>

        {/* ── Content ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full
                            text-center py-20">
              <span className="text-5xl mb-4">🛣️</span>
              <p className="text-road-text font-semibold text-lg mb-2">All clear nearby</p>
              <p className="text-road-muted text-sm max-w-xs">
                No active hazards within 5 km of your location.
                New reports appear here instantly.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {sorted.map(hazard => (
                <HazardCard
                  key={hazard._id}
                  hazard={hazard}
                  userLat={lat}
                  userLng={lng}
                  onVerify={id => verifyMutation.mutate(id)}
                  isVerifying={verifyMutation.isPending}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

      </div>
    </div>
  )
}
