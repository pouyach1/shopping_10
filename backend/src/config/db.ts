import mongoose from 'mongoose';

import { env } from './env';
import { logger } from '../utils/logger';

let listenersAttached = false;

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected');
  });
  mongoose.connection.on('error', (error: Error) => {
    logger.error('MongoDB connection error', error.message);
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}

export async function connectDB(uri = env.MONGODB_URI): Promise<typeof mongoose> {
  attachListeners();
  return mongoose.connect(uri, {
    serverSelectionTimeoutMS: env.isProd ? 10_000 : 5_000,
  });
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}

export function isDbReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getDbState(): 'connected' | 'disconnected' | 'connecting' | 'disconnecting' {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}
