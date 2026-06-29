// UserLocationMarker.tsx — the pulsing blue "you are here" dot on the map.
//
// WHY NOT USE LEAFLET'S DEFAULT MARKER?
// Leaflet's default marker is a blue pin icon — fine for static points.
// For the user's live location, we want a Google Maps / Uber style:
//   - Solid filled circle (blue dot)
//   - Animated pulsing ring radiating outward (shows GPS accuracy)
//   - White border around the dot
//
// HOW CUSTOM MARKERS WORK IN LEAFLET:
// Leaflet's L.divIcon() lets you use arbitrary HTML as a marker.
// React-Leaflet exposes this via the "icon" prop on <Marker>.
//
// We create a DivIcon with HTML+CSS and inject it as the marker's icon.
// Leaflet places this HTML at the exact lat/lng position on the map.

import { useMemo } from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import { GeoPosition } from '../../hooks/useGeolocation'

interface Props {
  position: GeoPosition
}

export default function UserLocationMarker({ position }: Props) {
  // useMemo: we only recreate the DivIcon when position changes.
  // L.divIcon() is not free — it creates DOM elements.
  // Without memoization, it would recreate on every parent re-render.
  const userIcon = useMemo(() => L.divIcon({
    // The HTML string that becomes the marker's visual.
    // Leaflet injects this into the DOM at the marker's position.
    html: `
      <div class="user-location-marker">
        <div class="user-location-pulse-ring"></div>
        <div class="user-location-dot"></div>
      </div>
    `,

    // iconSize: the pixel dimensions of the icon's container div.
    // Leaflet needs this to correctly center the icon over the lat/lng point.
    iconSize: [24, 24],

    // iconAnchor: which pixel of the icon sits exactly on the lat/lng coordinate.
    // [12, 12] = the center of the 24x24 icon sits on the coordinate.
    // Without this, the top-left corner would be on the coordinate (visually wrong).
    iconAnchor: [12, 12],

    // className: overrides Leaflet's default leaflet-div-icon class
    // which has a white border we don't want.
    className: '',
  }), [])  // Empty deps — icon shape never changes, only position changes

  return (
    <>
      {/* The accuracy circle — shows the radius of GPS uncertainty.
          If accuracy is 15m, a 15m radius circle shows around the dot.
          This is exactly what Google Maps shows in light blue around the blue dot.

          The Circle component draws a geographic circle on the map,
          so it scales correctly as the user zooms in and out. */}
      <Circle
        center={[position.lat, position.lng]}
        radius={position.accuracy}              // radius in meters
        pathOptions={{
          color:     '#3B82F6',   // Blue border
          fillColor: '#3B82F6',   // Blue fill
          fillOpacity: 0.08,      // Very translucent — just a hint of color
          weight: 1,              // Border thickness in pixels
        }}
      />

      {/* The actual marker dot with the pulsing ring */}
      <Marker
        position={[position.lat, position.lng]}
        icon={userIcon}
        // zIndexOffset: makes this marker render on TOP of all hazard markers.
        // Leaflet renders markers in DOM order by default; higher zIndexOffset = on top.
        zIndexOffset={1000}
      >
        <Popup
          // Offset the popup so it appears above the dot, not inside it
          offset={[0, -12]}
          className="user-location-popup"
        >
          <div className="text-xs space-y-1">
            <p className="font-semibold text-road-accent">You are here</p>
            <p className="text-road-muted font-mono">
              {position.lat.toFixed(6)}°N, {position.lng.toFixed(6)}°E
            </p>
            <p className="text-road-muted">
              Accuracy: ±{Math.round(position.accuracy)}m
            </p>
          </div>
        </Popup>
      </Marker>
    </>
  )
}
