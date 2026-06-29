// useGeolocation.ts — wraps the browser Geolocation API in a React hook.
//
// WHY A CUSTOM HOOK?
// navigator.geolocation.watchPosition() is an imperative side effect.
// React's rule: side effects live in useEffect, not during render.
// This hook encapsulates the lifecycle:
//   Mount  → start watching GPS
//   Update → expose position to components
//   Unmount → clearWatch (stop GPS, save battery)
//
// Any component can call useGeolocation() and get clean reactive state.
// The GPS logic is written once, tested once, reused everywhere.

import { useState, useEffect } from 'react'

export interface GeoPosition {
  lat:      number
  lng:      number
  accuracy: number  // radius of uncertainty in meters
  heading:  number | null  // direction of travel in degrees (null if stationary)
  speed:    number | null  // speed in m/s (null if stationary)
}

export interface GeolocationState {
  position:  GeoPosition | null
  isLoading: boolean
  error:     string | null
}

// Options passed to the browser's Geolocation API
const GEO_OPTIONS: PositionOptions = {
  // enableHighAccuracy: true → asks the device to use GPS chip, not just WiFi/IP.
  // More accurate (~3m vs ~40m) but uses more battery and is slower to acquire.
  // Worth it for our use case — we need accurate road-level positioning.
  enableHighAccuracy: true,

  // maximumAge: 0 → never use a cached position. Always get a fresh reading.
  // If we allowed caching, a user who opened the app while stopped at home
  // could appear at home even after driving 2km away.
  maximumAge: 0,

  // timeout: if the GPS doesn't return within 15 seconds, report an error.
  // Without a timeout, the browser waits indefinitely (bad UX on poor GPS signal).
  timeout: 15_000,
}

export function useGeolocation(): GeolocationState {
  const [position,  setPosition]  = useState<GeoPosition | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    // Check if the browser supports the Geolocation API.
    // Most modern browsers do, but it may be missing on very old browsers.
    // Also blocked in non-HTTPS contexts (Chrome enforces HTTPS for geolocation).
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // watchPosition fires the callback:
    //   - Once immediately with the first position reading
    //   - Again every time the device detects movement (typically every 1-5 seconds)
    //
    // Compare to getCurrentPosition which only fires ONCE.
    const watchId = navigator.geolocation.watchPosition(
      // ── Success Callback ───────────────────────────────────────────
      (pos: GeolocationPosition) => {
        setPosition({
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading:  pos.coords.heading,
          speed:    pos.coords.speed,
        })
        setError(null)
        setIsLoading(false)
      },

      // ── Error Callback ─────────────────────────────────────────────
      (err: GeolocationPositionError) => {
        // The error codes are defined by the W3C spec:
        // 1 = PERMISSION_DENIED  → user clicked "Block" on the permission prompt
        // 2 = POSITION_UNAVAILABLE → device can't determine position (indoor, airplane mode)
        // 3 = TIMEOUT            → GPS didn't respond within our 15s timeout
        const messages: Record<number, string> = {
          1: 'Location permission denied. Please enable location access in your browser settings.',
          2: 'Your location is unavailable. Check your device settings.',
          3: 'Location request timed out. Please try again.',
        }
        setError(messages[err.code] || 'An unknown location error occurred.')
        setIsLoading(false)
      },

      GEO_OPTIONS
    )

    // CLEANUP FUNCTION — this runs when the component using this hook unmounts.
    // clearWatch(watchId) stops the GPS tracking and cancels the watchPosition.
    // Without this cleanup:
    //   1. GPS continues running in the background (drains battery)
    //   2. The success callback fires on an unmounted component (React memory leak warning)
    // React's useEffect cleanup pattern handles this automatically.
    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])
  // Empty dependency array [] → this effect runs only ONCE when the component mounts.
  // We don't re-register watchPosition on every render — that would create multiple GPS watchers.

  return { position, isLoading, error }
}
