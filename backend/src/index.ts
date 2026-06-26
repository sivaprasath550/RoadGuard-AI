// index.ts is the ENTRY POINT of the entire backend server.
// Node.js starts executing from here.
//
// WHAT HAPPENS WHEN node src/index.ts RUNS:
// 1. Node.js starts a V8 JavaScript engine process
// 2. It initializes the event loop
// 3. It executes this file top-to-bottom
// 4. When it reaches server.listen(), it registers a callback with the OS
// 5. The event loop stays alive, waiting for incoming connections
// 6. Every incoming HTTP request goes through the event loop

// dotenv reads .env file and injects variables into process.env.
// MUST be called BEFORE anything else accesses process.env.
import 'dotenv/config'

import { createServer } from 'http'
import app from './app'
import { connectDatabase } from './config/database'
import { connectRedis } from './config/redis'
import { initializeSocket } from './socket/socketServer'

const PORT = process.env.PORT || 5000

async function bootstrap() {
  try {
    // Step 1: Connect to MongoDB
    // We MUST await this before starting the server.
    // If the server starts before DB connects, the first API call will fail.
    await connectDatabase()

    // Step 2: Connect to Redis
    await connectRedis()

    // Step 3: Create HTTP server from Express app.
    // WHY use http.createServer(app) instead of app.listen()?
    // Because Socket.io needs access to the raw http.Server object
    // to attach its WebSocket upgrade handler.
    // app.listen() also creates an http.Server internally but doesn't expose it.
    const httpServer = createServer(app)

    // Step 4: Attach Socket.io to the HTTP server
    initializeSocket(httpServer)

    // Step 5: Start listening for connections
    httpServer.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════╗
║       RoadGuard AI Backend            ║
║                                       ║
║  HTTP  : http://localhost:${PORT}        ║
║  Mode  : ${process.env.NODE_ENV || 'development'}              ║
╚═══════════════════════════════════════╝
      `)
    })

    // Graceful shutdown: handle SIGTERM (sent by Docker/Railway when stopping)
    // Instead of killing the process instantly, we:
    // 1. Stop accepting new connections
    // 2. Wait for in-flight requests to complete
    // 3. Close DB connections cleanly
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully...')
      httpServer.close(() => {
        console.log('HTTP server closed.')
        process.exit(0)
      })
    })

  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)  // Exit with error code so Docker/PM2 knows to restart
  }
}

bootstrap()
