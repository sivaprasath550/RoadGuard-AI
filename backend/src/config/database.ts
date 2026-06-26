// database.ts handles connecting to MongoDB via Mongoose.
//
// WHY MONGOOSE?
// MongoDB's native driver lets you store ANY shape of data.
// That's flexible but dangerous — nothing stops you from storing
// { email: 42 } in a users collection.
//
// Mongoose adds SCHEMAS: "A user document MUST have an email (string),
// a password (string), and a createdAt (Date). Reject everything else."
//
// This gives MongoDB the validation guarantees of a SQL database
// while keeping its flexibility.
//
// MONGOOSE CONNECTION STATES:
//   0 = disconnected
//   1 = connected
//   2 = connecting
//   3 = disconnecting
// Mongoose manages these states internally. We don't need to reconnect manually.

import mongoose from 'mongoose'

export async function connectDatabase(): Promise<void> {
  const MONGODB_URI = process.env.MONGODB_URI

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables')
  }

  try {
    // mongoose.connect() opens a connection pool (default: 5 connections).
    // A "connection pool" means multiple simultaneous queries can execute
    // without waiting for each other — each uses its own connection.
    await mongoose.connect(MONGODB_URI, {
      // How many connections to maintain in the pool.
      // For our scale: 10 is plenty. Netflix uses thousands.
      maxPoolSize: 10,

      // How long to wait before timing out when connecting (30s)
      serverSelectionTimeoutMS: 30000,

      // How long to wait for a query to complete (45s)
      socketTimeoutMS: 45000,
    })

    console.log(`✓ MongoDB connected: ${mongoose.connection.host}`)

    // Listen for connection events AFTER initial connect.
    // Mongoose automatically reconnects on drop — we just log it.
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠ MongoDB disconnected. Attempting to reconnect...')
    })

    mongoose.connection.on('reconnected', () => {
      console.log('✓ MongoDB reconnected.')
    })

  } catch (error) {
    console.error('✗ MongoDB connection failed:', error)
    throw error  // Re-throw so bootstrap() catches it and exits
  }
}
