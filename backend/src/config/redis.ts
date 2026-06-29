import Redis from 'ioredis'

export let redisClient: Redis

export async function connectRedis(): Promise<void> {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
  const isDev = process.env.NODE_ENV !== 'production'

  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,

    retryStrategy(times) {
      if (isDev && times > 2) return null  // Stop after 2 retries in dev
      return Math.min(times * 500, 30000)
    },

    enableOfflineQueue: false,
  })

  // Register error handler BEFORE ping so ioredis never fires an
  // "Unhandled error event" — ioredis requires at least one listener.
  redisClient.on('error', () => {})

  // 5-second hard timeout so ping() never hangs indefinitely.
  await Promise.race([
    redisClient.ping(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timed out after 5s')), 5000)
    ),
  ])

  console.log('✓ Redis connected.')

  redisClient.on('error', (err: Error) => {
    // Only log, don't crash — the server continues without Redis in dev.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠ Redis error (non-fatal in dev):', err.message)
    } else {
      console.error('✗ Redis error:', err.message)
    }
  })

  redisClient.on('reconnecting', () => {
    console.warn('⚠ Redis reconnecting...')
  })
}
