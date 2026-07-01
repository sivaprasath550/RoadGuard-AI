import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, AlertTriangle } from 'lucide-react'
import { useCreateHazard } from '../../hooks/useHazards'
import ImageUploadField from './ImageUploadField'
import type { HazardType, HazardSeverity } from '../../types'
import { HAZARD_META } from '../../types'

interface HazardReportModalProps {
  isOpen:    boolean
  onClose:   () => void
  latitude:  number
  longitude: number
}

const SEVERITY_OPTIONS: { value: HazardSeverity; label: string; color: string }[] = [
  { value: 'low',    label: 'Low',    color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high',   label: 'High',   color: '#EF4444' },
]

export default function HazardReportModal({
  isOpen,
  onClose,
  latitude,
  longitude,
}: HazardReportModalProps) {
  const [type,        setType]        = useState<HazardType>('pothole')
  const [description, setDescription] = useState('')
  const [severity,    setSeverity]    = useState<HazardSeverity>('medium')
  const [image,       setImage]       = useState<File | null>(null)
  const [error,       setError]       = useState('')

  const mutation = useCreateHazard(latitude, longitude)

  function resetForm() {
    setType('pothole')
    setDescription('')
    setSeverity('medium')
    setImage(null)
    setError('')
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!image) {
      setError('Please add a photo of the hazard.')
      return
    }
    if (!latitude || !longitude) {
      setError('Location not available. Please enable GPS.')
      return
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters.')
      return
    }

    try {
      await mutation.mutateAsync({
        type,
        description: description.trim(),
        severity,
        latitude,
        longitude,
        image,
      })
      handleClose()
    } catch (err: any) {
      const status = err?.response?.status ?? 0

      // 4xx = something the user can fix (validation, duplicate, etc.) — show it
      // 5xx or network = our problem, not the user's — show a generic message
      // Never forward raw server internals (Cloudinary errors, DB messages, etc.)
      const isUserError = status >= 400 && status < 500
      setError(
        isUserError
          ? (err?.response?.data?.error ?? err?.message ?? 'Request failed.')
          : 'Something went wrong on our end. Please try again.'
      )
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000]"
          />

          {/* Centering wrapper — flex column keeps dialog perfectly centered
              on every screen size without any breakpoint logic */}
          <div className="fixed inset-0 z-[2001] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{   opacity: 0, scale: 0.93, y: 12  }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="pointer-events-auto w-full max-w-md bg-road-surface
                         rounded-2xl shadow-2xl border border-white/10
                         flex flex-col"
              style={{ maxHeight: 'min(85vh, 620px)' }}
            >
              {/* ── Header (never scrolls) ──────────────────────────── */}
              <div className="flex-shrink-0 flex items-center justify-between
                              px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-road-warning" />
                  <h2 className="text-white font-semibold text-sm">Report Hazard</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ── Scrollable form body ────────────────────────────── */}
              <form
                onSubmit={handleSubmit}
                className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4"
              >
                {/* GPS row */}
                <div className="flex items-center gap-2 text-xs text-gray-400
                                bg-white/5 rounded-lg px-3 py-2">
                  <MapPin size={11} className="text-road-accent flex-shrink-0" />
                  <span>
                    {latitude !== 0
                      ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                      : 'Acquiring GPS…'}
                  </span>
                </div>

                {/* Hazard type — all 5 in one row */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Type <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(Object.entries(HAZARD_META) as [HazardType, typeof HAZARD_META[HazardType]][]).map(
                      ([key, meta]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setType(key)}
                          className={`
                            flex flex-col items-center gap-1 py-2 rounded-xl border
                            transition-all duration-150
                            ${type === key
                              ? 'border-road-accent bg-road-accent/10 text-white'
                              : 'border-white/10 text-gray-400 hover:border-white/30'}
                          `}
                        >
                          <span className="text-xl">{meta.emoji}</span>
                          <span className="text-[10px] leading-tight text-center">{meta.label}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe the hazard — size, exact location, danger level…"
                    rows={2}
                    maxLength={500}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2
                               text-sm text-white placeholder-gray-500
                               focus:outline-none focus:border-road-accent
                               resize-none transition-colors"
                  />
                  <div className="text-right text-xs text-gray-600 mt-0.5">
                    {description.length}/500
                  </div>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Severity
                  </label>
                  <div className="flex gap-2">
                    {SEVERITY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSeverity(opt.value)}
                        className={`
                          flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all
                          ${severity === opt.value
                            ? ''
                            : 'border-white/10 text-gray-400 hover:border-white/30'}
                        `}
                        style={
                          severity === opt.value
                            ? { borderColor: opt.color, background: `${opt.color}25`, color: opt.color }
                            : {}
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo */}
                <ImageUploadField
                  onFileSelect={setImage}
                  onClear={() => setImage(null)}
                />

                {/* Error */}
                {error && (
                  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20
                                rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full py-3 bg-road-warning text-black font-bold rounded-xl
                             hover:bg-yellow-400 active:scale-[0.98]
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all text-sm"
                >
                  {mutation.isPending ? 'Submitting…' : 'Submit Report'}
                </button>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
