import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { io } from 'socket.io-client'
import ngeohash from 'ngeohash'
import { getNearbyHazards, createHazard, verifyHazard } from '../services/hazardApi'
import type { Hazard, CreateHazardInput } from '../types'

// ── Query key factory ─────────────────────────────────────────────────
// Centralizing query keys prevents typos and makes invalidation predictable.
// ['hazards', 'nearby', lat, lng] is unique per coordinate —
// React Query caches each coordinate's result separately.
const hazardKeys = {
  nearby: (lat: number, lng: number) => ['hazards', 'nearby', lat, lng] as const,
}

// ── useNearbyHazards ──────────────────────────────────────────────────
// Fetches hazards near the given coordinate.
// Only runs when lat/lng are non-zero (user's position is known).
//
// staleTime: 30s — hazards don't change every second.
// Prevents unnecessary refetches while the user pans the map.
// refetchInterval: 60s — auto-refresh every minute to pick up new hazards
// from OTHER users without requiring a page reload.
export function useNearbyHazards(latitude: number, longitude: number) {
  return useQuery({
    queryKey:       hazardKeys.nearby(latitude, longitude),
    queryFn:        () => getNearbyHazards(latitude, longitude),
    enabled:        latitude !== 0 && longitude !== 0,
    staleTime:      30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

// ── useCreateHazard ───────────────────────────────────────────────────
// Mutation for submitting a new hazard report.
// On success: invalidates the nearby query so the new pin appears immediately.
export function useCreateHazard(latitude: number, longitude: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateHazardInput) => createHazard(input),
    onSuccess: () => {
      // Force React Query to re-fetch the nearby hazards list.
      // The new hazard will appear in the response and a new pin renders.
      queryClient.invalidateQueries({
        queryKey: hazardKeys.nearby(latitude, longitude),
      })
    },
  })
}

// ── useVerifyHazard ───────────────────────────────────────────────────
export function useVerifyHazard(latitude: number, longitude: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (hazardId: string) => verifyHazard(hazardId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: hazardKeys.nearby(latitude, longitude),
      })
    },
  })
}

// ── useHazardSocket ───────────────────────────────────────────────────
// Listens for real-time hazard events from Socket.io.
// When another user reports a hazard, the server broadcasts 'hazard:new'.
// We inject it directly into the React Query cache — no full refetch needed.
//
// This hook is used inside MapView so it's always active when the map is shown.
export function useHazardSocket(
  latitude: number,
  longitude: number,
  onNewHazard?: (hazard: Hazard) => void
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Don't connect until we have a real GPS fix.
    // geohash(0, 0, 4) produces a valid but wrong room.
    if (latitude === 0 || longitude === 0) return

    // Precision 4 ≈ city-sized cell (~39km × 20km).
    // Must match the precision used in hazardController.ts on the server.
    const room   = ngeohash.encode(latitude, longitude, 4)
    const socket = io({ withCredentials: true })

    // 'connect' fires on initial connection AND after every reconnection.
    // Re-joining the room here means dropped connections self-heal —
    // the client doesn't need any extra reconnect logic.
    socket.on('connect', () => socket.emit('join:room', room))

    socket.on('hazard:new', (hazard: Hazard) => {
      queryClient.setQueryData<Hazard[]>(
        hazardKeys.nearby(latitude, longitude),
        (old = []) => [hazard, ...old]
      )
      onNewHazard?.(hazard)
    })

    socket.on('hazard:resolved', ({ hazardId }: { hazardId: string }) => {
      queryClient.setQueryData<Hazard[]>(
        hazardKeys.nearby(latitude, longitude),
        (old = []) => old.filter(h => h._id !== hazardId)
      )
    })

    return () => {
      socket.emit('leave:room', room)
      socket.disconnect()
    }
  }, [latitude, longitude, queryClient, onNewHazard])
}
