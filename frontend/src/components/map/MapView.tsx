// MapView.tsx — the full-screen Leaflet map with tile layer, user location,
// and floating controls. This is the visual core of RoadGuard AI.
//
// COMPONENT RESPONSIBILITY:
//   - Own the Leaflet MapContainer (the map DOM element)
//   - Manage the map instance ref (so controls can call flyTo, zoomIn, etc.)
//   - Integrate geolocation state → fly to user on first fix
//   - Render tile layer, user marker, and controls
//
// LEAFLET + REACT LIFECYCLE:
// Leaflet is not a React library. It controls its own DOM subtree.
// React-Leaflet wraps it: each React-Leaflet component creates/destroys
// a Leaflet layer in useEffect, syncing React renders to Leaflet's DOM ops.
//
// KEY RULE: Components that use useMap() or useMapEvents() MUST be
// rendered as children of <MapContainer>. This is because MapContainer
// provides the map instance via React Context.

import { useRef, useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { Map as LeafletMap } from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, WifiOff } from 'lucide-react'

import { useGeolocation } from '../../hooks/useGeolocation'
import UserLocationMarker from './UserLocationMarker'
import MapControls from './MapControls'
import HazardLayer from './HazardLayer'

// ── CartoDB Dark Matter Tile Layer ────────────────────────────────────
// This gives us the premium dark map look (Google Maps dark mode equivalent).
// {s} = subdomain (a, b, c, d) — Carto load-balances across subdomains
// {z}/{x}/{y} = zoom/column/row — Leaflet fills these in for each tile
// {r} = empty string on normal screens, "@2x" on retina/HiDPI screens
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

// India's geographic center — default view before GPS kicks in
const INDIA_CENTER: [number, number] = [20.5937, 78.9629]
const DEFAULT_ZOOM = 5

// ── MapRefCapture — internal helper ──────────────────────────────────
// This tiny component lives INSIDE MapContainer so it can call useMap().
// It captures the map instance and stores it in the ref passed from MapView.
// This lets MapControls (outside MapContainer) imperatively control the map.
//
// WHY A SEPARATE COMPONENT instead of useMap() in MapView directly?
// useMap() can ONLY be called inside MapContainer's React tree.
// MapView renders the MapContainer, so it IS the parent — it can't use
// useMap() because the Context doesn't exist yet when MapView renders.
function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap()

  useEffect(() => {
    // Store the Leaflet map instance so MapControls can use it.
    mapRef.current = map

    // Cleanup: clear the ref when this component unmounts (map is destroyed).
    return () => { mapRef.current = null }
  }, [map, mapRef])

  return null  // Renders nothing — pure side effect component
}

// ── FlyToUser — flies map to user's location on first GPS fix ─────────
// Also a child of MapContainer so it can use useMap().
// Watches the position prop and flies to it once when first acquired.
function FlyToUser({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  const hasFlownRef = useRef(false)

  useEffect(() => {
    // Only fly on the FIRST position fix — don't re-fly on every GPS update.
    // The user may have panned away intentionally; we respect that.
    if (!hasFlownRef.current) {
      hasFlownRef.current = true
      map.flyTo([lat, lng], 16, {
        animate: true,
        duration: 2,
        easeLinearity: 0.25,
      })
    }
  }, [lat, lng, map])

  return null
}

// ── MapView (main export) ─────────────────────────────────────────────
interface Props {
  onReportClick: () => void
}

export default function MapView({ onReportClick }: Props) {
  // mapRef: stores the Leaflet map instance outside React's render cycle.
  // useRef() holds values that persist between renders without triggering re-renders.
  // We use MutableRefObject so MapRefCapture can write to it.
  const mapRef = useRef<LeafletMap | null>(null)

  const { position, isLoading, error } = useGeolocation()

  return (
    // Outer container fills all remaining space (parent is flex row)
    <div className="relative flex-1 h-full overflow-hidden">

      {/* ── Leaflet Map ──────────────────────────────────────────────── */}
      {/* MapContainer MUST have an explicit height — without it, Leaflet
          renders at 0px tall and the map is invisible (most common bug). */}
      <MapContainer
        center={INDIA_CENTER}
        zoom={DEFAULT_ZOOM}
        className="w-full h-full"
        // Disable Leaflet's built-in zoom controls — we built our own in MapControls
        zoomControl={false}
        // attributionControl: keep true (required by CartoDB and OSM licenses)
        attributionControl={true}
      >
        {/* Dark tile layer — this is what makes the map look premium */}
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          // maxZoom: highest zoom level this tile provider supports (20 for CartoDB)
          maxZoom={20}
          // subdomains: load-balance tile requests across a, b, c, d servers
          subdomains="abcd"
        />

        {/* Capture the Leaflet map instance into mapRef */}
        <MapRefCapture mapRef={mapRef} />

        {/* Once we have a GPS fix, fly there and show the location marker */}
        {position && (
          <>
            <FlyToUser lat={position.lat} lng={position.lng} />
            <UserLocationMarker position={position} />
          </>
        )}

        {/* Hazard pins — only render when we have a position */}
        {position && (
          <HazardLayer latitude={position.lat} longitude={position.lng} />
        )}
      </MapContainer>

      {/* ── Overlays (positioned OVER the map) ─────────────────────── */}

      {/* GPS loading state — shown while waiting for first position fix */}
      <AnimatePresence>
        {isLoading && !error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="
              absolute top-4 left-1/2 -translate-x-1/2
              z-[1000] flex items-center gap-2
              px-4 py-2 rounded-full
              bg-road-surface/90 backdrop-blur-sm
              border border-road-border
              text-road-muted text-sm
            "
          >
            {/* Spinning dot to indicate GPS searching */}
            <span className="w-2 h-2 rounded-full bg-road-accent animate-ping" />
            Acquiring location…
          </motion.div>
        )}
      </AnimatePresence>

      {/* GPS error state */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="
              absolute top-4 left-1/2 -translate-x-1/2
              z-[1000] flex items-center gap-2
              px-4 py-2 rounded-full
              bg-road-danger/10 backdrop-blur-sm
              border border-road-danger/30
              text-road-danger text-sm max-w-xs text-center
            "
          >
            <WifiOff className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* GPS acquired badge — flashes briefly when first fix is obtained */}
      <AnimatePresence>
        {position && !isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.3 }}
            className="
              absolute top-4 left-1/2 -translate-x-1/2
              z-[1000] flex items-center gap-2
              px-3 py-1.5 rounded-full
              bg-road-success/10 backdrop-blur-sm
              border border-road-success/30
              text-road-success text-xs font-medium
            "
          >
            <MapPin className="w-3 h-3" />
            {position.lat.toFixed(4)}°N {position.lng.toFixed(4)}°E
            <span className="text-road-muted">±{Math.round(position.accuracy)}m</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating action controls — positioned over the map */}
      <MapControls
        mapRef={mapRef}
        position={position}
        onReportClick={onReportClick}
      />
    </div>
  )
}
