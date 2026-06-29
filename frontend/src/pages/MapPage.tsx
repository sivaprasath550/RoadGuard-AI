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

export default function MapPage() {
  // reportModalOpen will control the hazard report modal in Phase 4.
  // We wire up the button now so MapControls has a real handler.
  const [reportModalOpen, setReportModalOpen] = useState(false)

  return (
    // h-screen: fills the full viewport height (100vh)
    // overflow-hidden: prevents any child from causing a scrollbar
    // bg-road-dark: fallback background while map tiles are loading
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-screen w-screen overflow-hidden bg-road-dark"
    >
      {/* Left navigation sidebar — fixed 80px wide */}
      <MapSidebar />

      {/* Map fills all remaining horizontal space.
          relative: so absolutely-positioned overlays (controls, badges)
          are positioned relative to this container, not the viewport. */}
      <div className="relative flex-1 h-full">
        <MapView onReportClick={() => setReportModalOpen(true)} />
      </div>

      {/* Phase 4 will add:
          <HazardReportModal
            isOpen={reportModalOpen}
            onClose={() => setReportModalOpen(false)}
          />
      */}
    </motion.div>
  )
}
