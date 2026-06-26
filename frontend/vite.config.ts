import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// defineConfig() gives TypeScript type-checking for Vite's config options.
// It's a helper — at runtime it just returns the object you pass it.
export default defineConfig({
  plugins: [
    // The React plugin does two things:
    // 1. Enables Fast Refresh (HMR that preserves React component state)
    // 2. Enables the automatic JSX transform (no need to import React manually)
    react(),
  ],

  resolve: {
    alias: {
      // This makes "@/components/Button" resolve to "src/components/Button".
      // path.resolve(__dirname, 'src') gives the absolute path to the src/ folder.
      // Without this alias, every import would need a relative path like '../../../'
      '@': path.resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 5173,  // Default Vite port

    // The proxy intercepts requests that START WITH "/api" and forwards them
    // to our backend server at http://localhost:5000.
    //
    // WHY DO WE NEED THIS?
    // The browser has a Same-Origin Policy: JavaScript on http://localhost:5173
    // cannot fetch from http://localhost:5000 unless CORS headers are set.
    //
    // Instead of dealing with CORS in development, the Vite dev server acts as
    // a middleman: browser thinks it's talking to :5173, Vite secretly forwards
    // the request to :5000. No CORS needed in dev.
    //
    // In PRODUCTION, a real reverse proxy (Nginx / Railway) does this job.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,  // Changes the Host header to match the target
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,  // Enable WebSocket proxying for Socket.io
      },
    },
  },

  build: {
    // Output directory for production build.
    // "vite build" compiles everything into dist/ as optimized static files.
    outDir: 'dist',

    // Generate source maps in production so errors in DevTools
    // show your original TypeScript code, not minified gibberish.
    sourcemap: true,
  },
})
