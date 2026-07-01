// socketServer.ts initializes Socket.io on the HTTP server.
//
// WHY SOCKET.IO INSTEAD OF RAW WEBSOCKETS?
// Raw WebSocket API is great but minimal. Socket.io adds:
//   - Auto-reconnection with backoff
//   - Fallback to HTTP long-polling (for environments blocking WebSocket)
//   - "Rooms" — group sockets and broadcast to all in a group
//   - "Namespaces" — multiple logical channels on one connection
//   - Event-based API instead of raw message strings
//   - Built-in acknowledgements (request-response over WebSocket)
//
// HOW THE HANDSHAKE WORKS:
// 1. Browser loads the page
// 2. Socket.io client sends HTTP request to /socket.io/?EIO=4&transport=polling
// 3. Server responds with a session ID and connection options
// 4. Client sends: "Can we upgrade to WebSocket?"
// 5. Server: "Yes" → both sides switch to WebSocket protocol (ws://)
// 6. From now on, both sides can send events at any time, in both directions
//
// This will be expanded massively in Phase 5 (Real-time Alerts).
// For now, we just initialize it so the server starts cleanly.

import { Server as HttpServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

export let io: SocketIOServer

// getIO() is a safe accessor used by controllers to broadcast events.
// Controllers can't import `io` directly at module load time because
// `io` is assigned inside initializeSocket(), which runs after the app boots.
// Using a getter avoids the "io used before assignment" timing issue.
export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.io not initialized — call initializeSocket() first')
  return io
}

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      // Must match the CORS config in app.ts
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },

    // Ping the client every 25 seconds to keep the connection alive.
    // If the client doesn't respond within 60 seconds, disconnect it.
    pingInterval: 25000,
    pingTimeout: 60000,
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`)
    })

    // Phase 5 will add:
    // socket.on('join:area', ...)   → user subscribes to geographic area
    // socket.on('leave:area', ...)  → user unsubscribes
    // io.to(areaRoom).emit('new:hazard', hazardData)  → broadcast to area
  })

  console.log('✓ Socket.io initialized.')
  return io
}
