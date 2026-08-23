import mongoose from 'mongoose';
import { env } from './env';

/**
 * Establishes the Mongoose connection to MongoDB.
 *
 * Connection lifecycle events are logged. A short server-selection timeout is
 * used so that, when MongoDB is not running, startup fails fast instead of
 * hanging for the Mongoose default of 30s (the caller decides whether that is
 * fatal).
 */
export async function connectDB(): Promise<void> {
  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected');
  });
  mongoose.connection.on('error', (error) => {
    console.error('[db] MongoDB connection error:', error.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
}
