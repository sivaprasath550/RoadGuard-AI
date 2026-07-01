import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { Hazard } from '../../types'
import { HAZARD_META } from '../../types'

interface HazardMarkerProps {
  hazard:     Hazard
  onVerify?:  (hazardId: string) => void
}

// createHazardIcon builds a custom Leaflet DivIcon for each hazard type.
//
// WHY DivIcon instead of the default blue pin?
// DivIcon renders arbitrary HTML/CSS as the marker.
// This lets us color-code pins by hazard type and add an emoji.
//
// iconAnchor: [16, 16] centers the icon on the coordinate.
// Without an anchor, the top-left corner of the icon sits on the coordinate.
function createHazardIcon(hazard: Hazard): L.DivIcon {
  const meta  = HAZARD_META[hazard.type]
  const count = hazard.verifiedBy.length

  return L.divIcon({
    className: '',   // Clear default Leaflet classes — we style from scratch
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${meta.color};
        border: 2px solid rgba(255,255,255,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        cursor: pointer;
      ">
        ${meta.emoji}
        ${count > 0 ? `
          <span style="
            position: absolute;
            top: -6px;
            right: -6px;
            background: #10B981;
            color: white;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            font-size: 10px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid white;
          ">${count}</span>
        ` : ''}
      </div>
    `,
    iconSize:   [32, 32],
    iconAnchor: [16, 16],   // Center of icon sits on the coordinate
    popupAnchor:[0, -20],   // Popup opens above the icon
  })
}

export default function HazardMarker({ hazard, onVerify }: HazardMarkerProps) {
  const meta = HAZARD_META[hazard.type]

  // GeoJSON stores [longitude, latitude] but Leaflet needs [latitude, longitude].
  // This swap is REQUIRED — getting it wrong places pins in the wrong hemisphere.
  const [lng, lat] = hazard.location.coordinates
  const position: [number, number] = [lat, lng]

  const reporterName =
    typeof hazard.reportedBy === 'object'
      ? (hazard.reportedBy as any).name
      : 'Unknown'

  const timeAgo = formatTimeAgo(hazard.createdAt)

  return (
    <Marker position={position} icon={createHazardIcon(hazard)}>
      <Popup className="hazard-popup">
        <div style={{ minWidth: '200px', fontFamily: 'sans-serif' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>{meta.emoji}</span>
            <div>
              <div style={{ fontWeight: 'bold', color: meta.color, fontSize: '14px' }}>
                {meta.label}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                {timeAgo} · by {reporterName}
              </div>
            </div>
          </div>

          {/* Image */}
          {hazard.imageUrl && (
            <img
              src={hazard.imageUrl}
              alt={meta.label}
              style={{
                width: '100%',
                borderRadius: '6px',
                marginBottom: '8px',
                objectFit: 'cover',
                maxHeight: '120px',
              }}
            />
          )}

          {/* Description */}
          <p style={{ fontSize: '12px', color: '#ccc', margin: '0 0 10px' }}>
            {hazard.description}
          </p>

          {/* Verify button */}
          {onVerify && (
            <button
              onClick={() => onVerify(hazard._id)}
              style={{
                width: '100%',
                padding: '6px',
                background: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              ✓ Confirm ({hazard.verifiedBy.length})
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
