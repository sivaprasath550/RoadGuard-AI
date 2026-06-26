// authStore.ts — global auth state managed by Zustand.
//
// WHAT LIVES HERE:
//   - The currently logged-in user object (or null)
//   - isLoading flag (while we check if the user is authenticated on app load)
//   - Actions: setUser, clearUser
//
// WHAT DOES NOT LIVE HERE:
//   - API calls (those are in authApi.ts, called by React Query hooks)
//   - Form state (that lives inside the form component)
//   - Server state / caching (that's React Query's job)
//
// Zustand manages CLIENT state (who is currently logged in).
// React Query manages SERVER state (data from the API).
// These two jobs are distinct.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User } from '../types'

interface AuthState {
  user:      User | null
  isLoading: boolean

  // Actions — functions that update the state
  setUser:   (user: User) => void
  clearUser: () => void
  setLoading:(loading: boolean) => void
}

// create<AuthState>() returns a React hook: useAuthStore()
//
// The persist middleware wraps the store and automatically:
//   1. Saves state to localStorage on every update
//   2. Rehydrates state from localStorage on app startup
//
// WHY PERSIST THE USER?
// Without persist: every page refresh → user is null → shows login screen
// With persist:    refresh → reads from localStorage → user is still logged in
//
// SECURITY NOTE: We only persist the user OBJECT (name, email, role).
// We do NOT persist tokens — tokens live in HttpOnly cookies (managed by browser).
// If someone reads localStorage, they see profile data but cannot act as the user.
export const useAuthStore = create<AuthState>()(
  persist(
    // The store creator function receives (set, get):
    //   set(partial) → merges partial state update (like React setState)
    //   get()        → returns current state (rarely needed)
    (set) => ({
      // ── Initial State ────────────────────────────────────────────
      user:      null,
      isLoading: true,  // true on load — we don't know if user is logged in yet

      // ── Actions ──────────────────────────────────────────────────
      setUser: (user: User) => set({ user, isLoading: false }),

      clearUser: () => set({ user: null, isLoading: false }),

      setLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      // Unique key for localStorage — change this to invalidate all saved states
      name: 'roadguard-auth',

      // Use localStorage (default). Could swap to sessionStorage for tab-only auth.
      storage: createJSONStorage(() => localStorage),

      // Only persist the user field — NOT isLoading (that's transient).
      // partialize controls which slices of state are saved to localStorage.
      partialize: (state) => ({ user: state.user }),
    }
  )
)
