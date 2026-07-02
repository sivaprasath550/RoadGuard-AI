import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  isLight: boolean
  toggleTheme: () => void
}

function applyTheme(isLight: boolean) {
  document.documentElement.classList.toggle('light', isLight)
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isLight: false,
      toggleTheme: () => set(state => {
        const next = !state.isLight
        applyTheme(next)
        return { isLight: next }
      }),
    }),
    {
      name: 'roadguard-theme',
      // After localStorage is loaded on page start, apply the stored theme class
      // immediately — before any React render so there's no flash of wrong theme.
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.isLight)
      },
    }
  )
)
