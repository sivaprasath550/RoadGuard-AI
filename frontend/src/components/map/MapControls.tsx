// MapControls.tsx — floating action buttons overlaid on the map.
//
// These buttons are NOT inside the Leaflet MapContainer.
// They are absolutely-positioned HTML elements that float OVER the map canvas.
// This is how Google Maps, Apple Maps, and Uber put their buttons over the map.
//
// STACKING CONTEXT:
// The map (Leaflet canvas) has z-index ~400 (Leaflet's internal value).
// Our controls have z-index 1000 — higher = appears on top.
// We use Tailwind's z-[1000] to set this.
//
// We receive a "mapRef" — a reference to the Leaflet map instance.
// This lets us imperatively call map.flyTo(), map.zoomIn() etc.
// from button click handlers — connecting React UI to Leaflet's API.

import { RefObject } from 'react'
import { Map as LeafletMap } from 'leaflet'
import { motion } from 'framer-motion'
import { Navigation, Plus, Minus, AlertTriangle } from 'lucide-react'
import { GeoPosition } from '../../hooks/useGeolocation'

interface Props {
  mapRef:   RefObject<LeafletMap | null>
  position: GeoPosition | null
  onReportClick: () => void  // Opens hazard report modal (Phase 4)
}

// Framer Motion: each button fades in from the right with a staggered delay.
// staggerChildren means each child's animation starts 100ms after the previous.
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const buttonVariants = {
  hidden:  { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export default function MapControls({ mapRef, position, onReportClick }: Props) {

  function handleLocateMe() {
    if (!mapRef.current || !position) return

    // flyTo() animates a smooth zoom and pan to the target coordinates.
    // animate: true → smooth easing animation
    // duration: 1.5 → animation takes 1.5 seconds
    // Compare to setView() which snaps instantly — no animation.
    mapRef.current.flyTo(
      [position.lat, position.lng],
      16,  // Zoom to street level
      { animate: true, duration: 1.5 }
    )
  }

  function handleZoomIn() {
    // zoomIn() increases zoom by 1 level with animation.
    // Leaflet's internal animation uses requestAnimationFrame for smooth transitions.
    mapRef.current?.zoomIn()
  }

  function handleZoomOut() {
    mapRef.current?.zoomOut()
  }

  return (
    // Absolute positioned container — floats over the map in the bottom-right
    <div className="absolute bottom-8 right-4 z-[1000] flex flex-col items-end gap-3">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-end gap-2"
      >
        {/* Report Hazard — primary CTA (Phase 4 wires this up fully) */}
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

        {/* Locate Me */}
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

        {/* Zoom controls — grouped together */}
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
