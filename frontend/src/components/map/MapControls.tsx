import { RefObject } from 'react'
import { Map as LeafletMap } from 'leaflet'
import { motion } from 'framer-motion'
import { Navigation, Plus, Minus, AlertTriangle } from 'lucide-react'
import { GeoPosition } from '../../hooks/useGeolocation'

interface Props {
  mapRef:        RefObject<LeafletMap | null>
  position:      GeoPosition | null
  onReportClick: () => void
}

const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const buttonVariants = {
  hidden:  { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export default function MapControls({ mapRef, position, onReportClick }: Props) {
  function handleLocateMe() {
    if (!mapRef.current || !position) return
    mapRef.current.flyTo([position.lat, position.lng], 16, { animate: true, duration: 1.5 })
  }

  function handleZoomIn()  { mapRef.current?.zoomIn()  }
  function handleZoomOut() { mapRef.current?.zoomOut() }

  return (
    <div className="absolute bottom-8 right-4 z-[1000] flex flex-col items-end gap-3">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-end gap-2"
      >
        {/* ── Report Hazard ───────────────────────────────────────── */}
        <motion.button
          variants={buttonVariants}
          onClick={onReportClick}
          className="
            flex items-center gap-2 px-4 py-3 rounded-2xl
            bg-road-danger hover:bg-red-600
            text-white text-sm font-semibold
            shadow-lg shadow-red-500/20
            transition-colors duration-200 active:scale-95
          "
          aria-label="Report a road hazard"
        >
          <AlertTriangle className="w-4 h-4" />
          Report Hazard
        </motion.button>

        {/* ── Locate Me ──────────────────────────────────────────── */}
        <motion.button
          variants={buttonVariants}
          onClick={handleLocateMe}
          disabled={!position}
          className="
            p-3 rounded-2xl
            bg-road-surface hover:bg-road-border
            border border-road-border
            text-road-accent
            shadow-lg transition-colors duration-200
            active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
          "
          aria-label="Fly to my location"
          title="Go to my location"
        >
          <Navigation className="w-5 h-5" />
        </motion.button>

        {/* ── Zoom controls ───────────────────────────────────────── */}
        <motion.div
          variants={buttonVariants}
          className="flex flex-col rounded-2xl overflow-hidden border border-road-border shadow-lg"
        >
          <button
            onClick={handleZoomIn}
            className="
              p-3 bg-road-surface hover:bg-road-border
              text-road-text transition-colors duration-200
              active:scale-95 border-b border-road-border
            "
            aria-label="Zoom in"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="
              p-3 bg-road-surface hover:bg-road-border
              text-road-text transition-colors duration-200
              active:scale-95
            "
            aria-label="Zoom out"
          >
            <Minus className="w-5 h-5" />
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
