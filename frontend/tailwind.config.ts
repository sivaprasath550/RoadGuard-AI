import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  // 'class' strategy: dark mode is toggled by adding/removing
  // the 'dark' class on <html>. We use this alongside CSS variables.
  darkMode: 'class',

  theme: {
    extend: {
      // All road-* colors now point at CSS custom properties defined in index.css.
      // The 'rgb(var(...) / <alpha-value>)' syntax makes opacity modifiers work:
      //   bg-road-surface/80 → background: rgb(var(--road-surface) / 0.8)
      // Changing the CSS variable at runtime (via .light class on <html>)
      // instantly recolors EVERY element that uses any road-* class.
      colors: {
        road: {
          dark:           'rgb(var(--road-dark)           / <alpha-value>)',
          darker:         'rgb(var(--road-darker)         / <alpha-value>)',
          surface:        'rgb(var(--road-surface)        / <alpha-value>)',
          border:         'rgb(var(--road-border)         / <alpha-value>)',
          accent:         'rgb(var(--road-accent)         / <alpha-value>)',
          'accent-hover': 'rgb(var(--road-accent-hover)   / <alpha-value>)',
          warning:        'rgb(var(--road-warning)        / <alpha-value>)',
          danger:         'rgb(var(--road-danger)         / <alpha-value>)',
          success:        'rgb(var(--road-success)        / <alpha-value>)',
          text:           'rgb(var(--road-text)           / <alpha-value>)',
          muted:          'rgb(var(--road-muted)          / <alpha-value>)',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },

      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.3s ease-out',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
      },
    },
  },

  plugins: [],
}

export default config
