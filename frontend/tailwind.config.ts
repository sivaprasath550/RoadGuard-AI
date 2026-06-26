import type { Config } from 'tailwindcss'

const config: Config = {
  // "content" tells Tailwind WHERE to scan for class names.
  // Tailwind works by scanning your files, finding every class you used,
  // and generating ONLY those CSS rules. This is called "tree-shaking CSS".
  //
  // Without this, Tailwind would output 3MB of CSS (every possible utility class).
  // With this, the final CSS is typically under 10KB — only what you actually use.
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',  // Scan all JS/TS/JSX/TSX files in src/
  ],

  theme: {
    extend: {
      // Custom color palette for RoadGuard AI's dark premium theme.
      // These become utility classes like: bg-road-dark, text-road-accent
      colors: {
        road: {
          dark:      '#0A0A0F',   // Near-black background (like Tesla UI)
          darker:    '#050508',   // Even darker for cards
          surface:   '#12121A',   // Card surfaces
          border:    '#1E1E2E',   // Subtle borders
          accent:    '#3B82F6',   // Primary blue (like Google Maps blue)
          'accent-hover': '#2563EB',
          warning:   '#F59E0B',   // Amber for caution hazards
          danger:    '#EF4444',   // Red for severe hazards
          success:   '#10B981',   // Green for resolved/safe
          text:      '#E2E8F0',   // Primary text
          muted:     '#64748B',   // Secondary/muted text
        },
      },

      // Custom font for a premium feel
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },

      // Custom animations we'll use with Framer Motion + Tailwind
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
      },
    },
  },

  plugins: [],
}

export default config
