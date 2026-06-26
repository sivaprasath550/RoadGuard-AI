// ProtectedRoute.tsx — wraps routes that require authentication.
//
// HOW IT WORKS:
// React Router renders <ProtectedRoute> as a parent route.
// If the user is authenticated → render children (the actual page).
// If loading          → render spinner (checking auth status).
// If not logged in    → redirect to /login.
//
// This pattern is called a "route guard" — common in every serious React app.
//
// The key insight: we check the Zustand store (local state), NOT the server.
// The server was already checked in useCurrentUser() which runs once on app load.
// After that, the store is the source of truth.

import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function ProtectedRoute() {
  // Reading from Zustand store — no API call, instant
  const { user, isLoading } = useAuthStore()

  // Still checking if user is authenticated (e.g., on first page load,
  // useCurrentUser() is fetching from /auth/me)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-road-dark">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full bg-road-accent animate-pulse-ring" />
          <div className="absolute inset-2 rounded-full bg-road-accent" />
        </div>
      </div>
    )
  }

  // Not logged in → redirect to /login
  // 'replace: true' replaces the history entry so pressing Back
  // doesn't bring them back to the protected page
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // <Outlet /> renders the matched child route's component.
  // This is how nested routes work in React Router v6.
  return <Outlet />
}
