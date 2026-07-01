import { useNearbyHazards, useVerifyHazard, useHazardSocket } from '../../hooks/useHazards'
import HazardMarker from './HazardMarker'

interface HazardLayerProps {
  latitude:  number
  longitude: number
}

// HazardLayer is a renderless data component — it lives INSIDE <MapContainer>
// so its children (Markers) are rendered directly into the Leaflet map.
//
// WHY a separate component instead of putting this in MapView?
// MapView already handles the map setup, tile layer, and user location.
// Keeping hazards in their own component:
//   - Keeps each file focused on one responsibility
//   - HazardLayer re-renders when hazard data changes; MapView doesn't
//   - Easy to add/remove from the map by mounting/unmounting this component
export default function HazardLayer({ latitude, longitude }: HazardLayerProps) {
  const { data: hazards = [] } = useNearbyHazards(latitude, longitude)
  const verifyMutation         = useVerifyHazard(latitude, longitude)

  // Connect to Socket.io for real-time updates.
  // When another user reports a hazard nearby, it appears instantly.
  useHazardSocket(latitude, longitude)

  return (
    <>
      {hazards.map(hazard => (
        <HazardMarker
          key={hazard._id}
          hazard={hazard}
          onVerify={id => verifyMutation.mutate(id)}
        />
      ))}
    </>
  )
}
