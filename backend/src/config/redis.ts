// redis.ts handles connecting to Redis via ioredis.
//
// WHY REDIS?
// MongoDB stores data on DISK. Every query reads from disk.
// Disk speed: ~100MB/s (SSD), latency: ~0.1ms
//
// Redis stores data in RAM. Every read/write is in-memory.
// RAM speed: ~50GB/s, latency: ~0.001ms (100x faster than SSD)
//
// USE CASES IN ROADGUARD AI:
//   1. Cache nearby hazards by geohash → avoid DB query on every GPS ping
//   2. Rate limiting counters (faster than hitting MongoDB)
//   3. Session storage (optional, if we move away from cookies)
//   4. Pub/Sub for Socket.io in multi-instance deployments
//
// WHAT IS IOREDIS?
// The official 'redis' npm package is fine, but ioredis has:
//   - Built-in reconnection with exponential backoff
//   - Pipeline support (batch multiple commands)
//   - Cluster support
//   - Better TypeScript types
//   - Used by Vercel, Shopify, and others in production

import Redis from 'ioredis'

// Export the client so other modules can use it directly.
// We use 'let' because we assign it in connectRedis().
export let redisClient: Redis

export async function connectRedis(): Promise<void> {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

  redisClient = new Redis(REDIS_URL, {
    // ioredis retries failed connections automatically.
    // maxRetriesPerRequest: null = retry infinitely (for long-running apps)
    maxRetriesPerRequest: null,

    // Reconnect strategy: exponential backoff capped at 30 seconds.
    // If Redis goes down, we don't hammer it every 1ms.
    retryStrategy(times) {
      const delay = Math.min(times * 100, 30000)
      console.log(`Redis retry in ${delay}ms (attempt ${times})`)
      return delay
    },
  })

  // ioredis connects lazily — we ping to verify the connection is actually alive.
  await redisClient.ping()
  console.log('✓ Redis connected.')

  redisClient.on('error', (err) => {
    console.error('✗ Redis error:', err.message)
  })

  redisClient.on('reconnecting', () => {
    console.warn('⚠ Redis reconnecting...')
  })
}
