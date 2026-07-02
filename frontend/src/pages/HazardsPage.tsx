import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { MapPin, CheckCircle, SlidersHorizontal, X } from 'lucide-react'
import MapSidebar from '../components/map/MapSidebar'
import { useGeolocation } from '../hooks/useGeolocation'
import { useNearbyHazards, useVerifyHazard } from '../hooks/useHazards'
import { HAZARD_META } from '../types'
import type { Hazard, HazardType, HazardSeverity } from '../types'
import { distanceKm, formatDistance, timeAgo } from '../utils/geo'

// ── Constants ──────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: HazardType; label: string; emoji: string }[] = [
  { value: 'pothole',      label: 'Pothole',      emoji: '🕳️'  },
  { value: 'flooding',     label: 'Flooding',     emoji: '🌊'  },
  { value: 'fallen_tree',  label: 'Fallen Tree',  emoji: '🌳'  },
  { value: 'construction', label: 'Construction', emoji: '🚧'  },
  { value: 'accident',     label: 'Accident',     emoji: '🚨'  },
]

const SEVERITY_OPTIONS: { value: HazardSeverity; label: string; activeClass: string }[] = [
  { value: 'low',    label: 'Low',    activeClass: 'border-road-success bg-road-success/10 text-road-success' },
  { value: 'medium', label: 'Medium', activeClass: 'border-road-warning bg-road-warning/10 text-road-warning' },
  { value: 'high',   label: 'High',   activeClass: 'border-road-danger  bg-road-danger/10  text-road-danger'  },
]

type SortKey = 'newest' | 'nearest' | 'verified'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',   label: 'Newest first'       },
  { value: 'nearest',  label: 'Nearest first'      },
  { value: 'verified', label: 'Most verified'      },
]

const SEVERITY_DOT: Record<HazardSeverity, string> = {
  low:    'bg-road-success',
  medium: 'bg-road-warning',
  high:   'bg-road-danger',
}

// ── HazardCard ─────────────────────────────────────────────────────────
interface CardProps {
  hazard:      Hazard
  km:          number     // pre-computed so the sort doesn't re-run haversine
  onVerify:    (id: string) => void
  isVerifying: boolean
}

function HazardCard({ hazard, km, onVerify, isVerifying }: CardProps) {
  const meta = HAZARD_META[hazard.type]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1     }}
      exit={{   opacity: 0, scale: 0.97   }}
      layout
      className="bg-road-surface border border-road-border rounded-2xl overflow-hidden
                 hover:border-road-muted transition-colors duration-200 flex flex-col"
    >
      {/* Image thumbnail — fixed height so cards don't shift as images load */}
      <div className="h-32 bg-road-border overflow-hidden shrink-0">
        <img
          src={hazard.imageUrl}
          alt={meta.label}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Type + severity */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-lg leading-none">{meta.emoji}</span>
            <span className="text-road-text font-semibold text-sm">{meta.label}</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[hazard.severity]}`} />
        </div>

        {/* Description */}
        <p className="text-road-muted text-xs leading-relaxed line-clamp-2 mb-3 flex-1">
          {hazard.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[11px] text-road-muted">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {formatDistance(km)}
            </span>
            <span>{timeAgo(hazard.createdAt)}</span>
          </div>

          <button
            onClick={() => onVerify(hazard._id)}
            disabled={isVerifying}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium
                       bg-road-accent/10 text-road-accent border border-road-accent/20
                       hover:bg-road-accent/20 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-3 h-3" />
            {hazard.verifiedBy.length}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Skeleton card ──────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-road-surface border border-road-border rounded-2xl overflow-hidden animate-pulse">
      <div className="h-32 bg-road-border" />
      <div className="p-4 space-y-2.5">
        <div className="flex justify-between">
          <div className="h-4 w-20 bg-road-border rounded" />
          <div className="h-3 w-3 bg-road-border rounded-full" />
        </div>
        <div className="h-3 w-full bg-road-border rounded" />
        <div className="h-3 w-2/3 bg-road-border rounded" />
        <div className="flex justify-between pt-1">
          <div className="h-3 w-16 bg-road-border rounded" />
          <div className="h-5 w-10 bg-road-border rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// ── FilterChip ─────────────────────────────────────────────────────────
function FilterChip({
  label,
  active,
  activeClass = 'border-road-accent bg-road-accent/10 text-road-accent',
  onClick,
}: {
  label:        React.ReactNode
  active:       boolean
  activeClass?: string
  onClick:      () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150
        ${active
          ? activeClass
          : 'border-road-border text-road-muted hover:border-road-muted hover:text-road-text'
        }`}
    >
      {label}
    </button>
  )
}

// ── HazardsPage ────────────────────────────────────────────────────────
export default function HazardsPage() {
  const { position, isLoading: gpsLoading } = useGeolocation()
  const lat = position?.lat ?? 0
  const lng = position?.lng ?? 0

  const { data: hazards = [], isLoading: hazardsLoading } = useNearbyHazards(lat, lng)
  const verifyMutation = useVerifyHazard(lat, lng)

  // URL is the single source of truth for filter state.
  // /hazards?type=flooding&severity=high&sort=nearest
  const [searchParams, setSearchParams] = useSearchParams()
  const typeFilter     = searchParams.get('type')     as HazardType | null
  const severityFilter = searchParams.get('severity') as HazardSeverity | null
  const sortBy         = (searchParams.get('sort') ?? 'newest') as SortKey

  // 30s tick to keep time-ago strings fresh without re-fetching
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Derive the visible list: filter → precompute distance → sort
  // useMemo ensures this only recomputes when the inputs actually change.
  const cards = useMemo(() => {
    const filtered = hazards
      .filter(h => !typeFilter     || h.type === typeFilter)
      .filter(h => !severityFilter || h.severity === severityFilter)

    // Pre-compute distance once per item so sort doesn't run haversine N² times
    const withDist = filtered.map(h => ({
      hazard: h,
      km: distanceKm(lat, lng, h.location.coordinates[1], h.location.coordinates[0]),
    }))

    withDist.sort((a, b) => {
      if (sortBy === 'nearest')  return a.km - b.km
      if (sortBy === 'verified') return b.hazard.verifiedBy.length - a.hazard.verifiedBy.length
      // newest (default)
      return new Date(b.hazard.createdAt).getTime() - new Date(a.hazard.createdAt).getTime()
    })

    return withDist
  }, [hazards, typeFilter, severityFilter, sortBy, lat, lng])

  function setFilter(key: string, value: string | null) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else       next.delete(key)
      return next
    })
  }

  function clearFilters() {
    setSearchParams({})
  }

  const activeFilterCount = [typeFilter, severityFilter].filter(Boolean).length
  const isLoading         = gpsLoading || hazardsLoading

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-road-dark">
      <MapSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-road-border bg-road-darker/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-road-text font-bold text-xl mb-0.5">Hazards</h1>
              <p className="text-road-muted text-sm">
                {isLoading
                  ? 'Loading…'
                  : `${cards.length} hazard${cards.length !== 1 ? 's' : ''} within 5 km`}
              </p>
            </div>

            {/* Clear filters button — only visible when a filter is active */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs
                           font-medium text-road-muted border border-road-border
                           hover:border-road-muted hover:text-road-text transition-colors"
              >
                <X className="w-3 h-3" />
                Clear filters
                <span className="w-4 h-4 rounded-full bg-road-accent text-white
                                 text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ── Filter bar ───────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-road-border
                        bg-road-darker/30 space-y-2.5">

          {/* Type chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] text-road-muted
                             font-medium w-16 shrink-0">
              <SlidersHorizontal className="w-3 h-3" /> Type
            </span>
            <FilterChip
              label="All"
              active={!typeFilter}
              onClick={() => setFilter('type', null)}
            />
            {TYPE_OPTIONS.map(opt => (
              <FilterChip
                key={opt.value}
                label={<span>{opt.emoji} {opt.label}</span>}
                active={typeFilter === opt.value}
                onClick={() => setFilter('type', typeFilter === opt.value ? null : opt.value)}
              />
            ))}
          </div>

          {/* Severity + Sort row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-road-muted font-medium w-16 shrink-0">
                Severity
              </span>
              <FilterChip
                label="All"
                active={!severityFilter}
                onClick={() => setFilter('severity', null)}
              />
              {SEVERITY_OPTIONS.map(opt => (
                <FilterChip
                  key={opt.value}
                  label={opt.label}
                  active={severityFilter === opt.value}
                  activeClass={opt.activeClass}
                  onClick={() =>
                    setFilter('severity', severityFilter === opt.value ? null : opt.value)
                  }
                />
              ))}
            </div>

            {/* Sort — right-aligned */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-road-muted font-medium">Sort</span>
              <select
                value={sortBy}
                onChange={e => setFilter('sort', e.target.value === 'newest' ? null : e.target.value)}
                disabled={sortBy === 'nearest' && !position}
                className="bg-road-surface border border-road-border text-road-text
                           text-xs rounded-xl px-3 py-1.5 outline-none
                           focus:border-road-accent transition-colors cursor-pointer"
              >
                {SORT_OPTIONS.map(opt => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.value === 'nearest' && !position}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Card grid ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <span className="text-5xl mb-4">🔍</span>
              <p className="text-road-text font-semibold text-lg mb-2">
                {activeFilterCount > 0 ? 'No matches' : 'All clear nearby'}
              </p>
              <p className="text-road-muted text-sm max-w-xs">
                {activeFilterCount > 0
                  ? 'No hazards match the current filters. Try removing one.'
                  : 'No active hazards within 5 km of your location.'}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-medium
                             bg-road-accent/10 text-road-accent border border-road-accent/20
                             hover:bg-road-accent/20 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              <div className="grid grid-cols-2 gap-4">
                {cards.map(({ hazard, km }) => (
                  <HazardCard
                    key={hazard._id}
                    hazard={hazard}
                    km={km}
                    onVerify={id => verifyMutation.mutate(id)}
                    isVerifying={verifyMutation.isPending}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

      </div>
    </div>
  )
}
