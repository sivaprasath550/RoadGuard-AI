// MapPage.tsx — the main application screen. This is what users see after login.
//
// LAYOUT STRATEGY:
// We use a full-screen flex row:
//   [Sidebar 80px] [Map fills remaining space]
//
// This is how Google Maps, Waze, and Uber's web apps are structured.
// The sidebar is a fixed-width column; the map is flex-1 (takes all remaining).
//
// The map MUST fill the remaining height exactly.
// If the parent doesn't have h-screen, the map collapses to 0px.
// Every ancestor in the DOM chain needs a defined height for flex-1 to work.

import { useState } from 'react'
import { motion } from 'framer-motion'
import MapSidebar from '../components/map/MapSidebar'
import MapView from '../components/map/MapView'
import HazardReportModal from '../components/hazard/HazardReportModal'
import { useGeolocation } from '../hooks/useGeolocation'

export default function MapPage() {
  const [reportModalOpen, setReportModalOpen] = useState(false)

  // useGeolocation here (in addition to MapView) so the modal knows
  // the user's current coordinates when they open the report form.
  // The hook uses watchPosition internally — calling it twice is safe
  // because the browser deduplicates GPS watches.
  const { position } = useGeolocation()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-screen w-screen overflow-hidden bg-road-dark"
    >
      <MapSidebar />

      <div className="relative flex-1 h-full">
        <MapView onReportClick={() => setReportModalOpen(true)} />
      </div>

      {/* Hazard report modal — rendered outside MapView so it sits
          above the map in the z-index stack without Leaflet interference */}
      <HazardReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        latitude={position?.lat  ?? 0}
        longitude={position?.lng ?? 0}
      />
    </motion.div>
  )
}
