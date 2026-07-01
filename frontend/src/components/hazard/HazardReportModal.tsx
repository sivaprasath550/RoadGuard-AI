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
      setError(
        err?.response?.data?.error ||
        err?.message ||
        'Failed to submit report. Please try again.'
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000]"
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[2001] bg-road-surface
                       rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto
                       md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2
                       md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-road-warning" />
                <h2 className="text-white font-semibold">Report Hazard</h2>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-5">
              {/* Location indicator */}
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 rounded-lg px-3 py-2">
                <MapPin size={12} className="text-road-accent flex-shrink-0" />
                <span>
                  {latitude !== 0
                    ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                    : 'Acquiring GPS…'}
                </span>
              </div>

              {/* Hazard type selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hazard Type <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(HAZARD_META) as [HazardType, typeof HAZARD_META[HazardType]][]).map(
                    ([key, meta]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setType(key)}
                        className={`
                          flex flex-col items-center gap-1 p-2 rounded-xl border text-xs
                          transition-all duration-150
                          ${type === key
                            ? 'border-road-accent bg-road-accent/10 text-white'
                            : 'border-white/10 text-gray-400 hover:border-white/30'}
                        `}
                      >
                        <span className="text-xl">{meta.emoji}</span>
                        <span>{meta.label}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the hazard — size, exact location, danger level…"
                  rows={3}
                  maxLength={500}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2
                             text-sm text-white placeholder-gray-500
                             focus:outline-none focus:border-road-accent
                             resize-none transition-colors"
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {description.length}/500
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Severity
                </label>
                <div className="flex gap-2">
                  {SEVERITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSeverity(opt.value)}
                      className={`
                        flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                        ${severity === opt.value
                          ? 'text-white'
                          : 'border-white/10 text-gray-400 hover:border-white/30'}
                      `}
                      style={severity === opt.value
                        ? { borderColor: opt.color, background: `${opt.color}22`, color: opt.color }
                        : {}
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image upload */}
              <ImageUploadField
                file={image}
                onFileSelect={setImage}
                onClear={() => setImage(null)}
              />

              {/* Error */}
              {error && (
                <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full py-3 bg-road-warning text-black font-bold rounded-xl
                           hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors text-sm"
              >
                {mutation.isPending ? 'Submitting…' : 'Submit Report'}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
