// AppRoutes.tsx — all URL-to-component mappings with auth protection.

import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useCurrentUser } from '../hooks/useAuth'
import ProtectedRoute from '../components/ProtectedRoute'

const MapPage      = lazy(() => import('@/pages/MapPage'))
const AlertsPage   = lazy(() => import('@/pages/AlertsPage'))
const HazardsPage  = lazy(() => import('@/pages/HazardsPage'))
const LoginPage    = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const ProfilePage  = lazy(() => import('@/pages/ProfilePage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen w-screen bg-road-dark">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full bg-road-accent animate-pulse-ring" />
          <div className="absolute inset-2 rounded-full bg-road-accent" />
        </div>
        <p className="text-road-muted text-sm tracking-widest uppercase">Loading</p>
      </div>
    </div>
  )
}

export default function AppRoutes() {
  // Bootstrap: on every app load, silently check if the user has a valid
  // session by calling GET /api/auth/me with the stored cookie.
  // This sets the Zustand store so ProtectedRoute has accurate data.
  // useCurrentUser() runs ONCE (React Query caches the result).
  useCurrentUser()

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/map" replace />} />

        {/* Public routes */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes — ProtectedRoute checks auth before rendering Outlet */}
        <Route element={<ProtectedRoute />}>
          <Route path="/map"     element={<MapPage />} />
          <Route path="/alerts"  element={<AlertsPage />} />
          <Route path="/hazards" element={<HazardsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>
    </Suspense>
  )
}
