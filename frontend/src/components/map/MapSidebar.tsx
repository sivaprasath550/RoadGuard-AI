// MapSidebar.tsx — fixed left navigation panel.
//
// UI PATTERN: the "rail" sidebar used by Google Maps, VS Code, Figma.
// Narrow on desktop (just icons + labels), expands on hover or toggle.
// On mobile: slides in as a drawer (Phase future — for now, hidden on mobile).

import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Shield,
  Map,
  AlertTriangle,
  User,
  LogOut,
  Bell,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useLogout } from '../../hooks/useAuth'
import { useThemeStore } from '../../store/themeStore'

// NavLink items for the sidebar
const NAV_ITEMS = [
  { to: '/map',     icon: Map,           label: 'Map'       },
  { to: '/alerts',  icon: Bell,          label: 'Alerts'    },
  { to: '/hazards', icon: AlertTriangle, label: 'Hazards'   },
  { to: '/profile', icon: User,          label: 'Profile'   },
]

export default function MapSidebar() {
  const { user } = useAuthStore()
  const logoutMutation = useLogout()
  const { isLight, toggleTheme } = useThemeStore()

  return (
    // Framer Motion: sidebar slides in from the left on mount
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="
        relative z-[1000]
        flex flex-col items-center
        w-20 h-full
        bg-road-darker border-r border-road-border
        py-6 gap-2
        shadow-2xl
      "
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-10 h-10 rounded-xl bg-road-accent/10 border border-road-accent/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-road-accent" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-1 flex-1 w-full px-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          // NavLink automatically adds an "active" class when the URL matches "to".
          // We use this to highlight the current page's icon.
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `
              flex flex-col items-center justify-center
              w-full py-3 rounded-xl gap-1.5
              text-xs font-medium transition-all duration-200
              ${isActive
                ? 'bg-road-accent/10 text-road-accent'
                : 'text-road-muted hover:text-road-text hover:bg-road-surface'
              }
            `}
            aria-label={label}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Avatar + Logout at the bottom */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="
            flex flex-col items-center justify-center
            w-full py-3 rounded-xl gap-1.5
            text-road-muted hover:text-road-accent hover:bg-road-surface
            transition-all duration-200
          "
          aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          <span className="text-[10px] tracking-wide">{isLight ? 'Dark' : 'Light'}</span>
        </button>
        {/* User avatar — shows initial if no photo */}
        <NavLink
          to="/profile"
          className="
            w-10 h-10 rounded-xl overflow-hidden
            border-2 border-road-border hover:border-road-accent
            transition-colors duration-200
            flex items-center justify-center
            bg-road-surface text-road-accent font-semibold text-sm
          "
          aria-label="View profile"
        >
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            : user?.name?.[0]?.toUpperCase() ?? '?'
          }
        </NavLink>

        {/* Logout button */}
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="
            flex flex-col items-center justify-center
            w-full py-3 rounded-xl gap-1.5
            text-road-muted hover:text-road-danger hover:bg-red-500/10
            transition-all duration-200
            disabled:opacity-50
          "
          aria-label="Log out"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] tracking-wide">Logout</span>
        </button>
      </div>
    </motion.aside>
  )
}
