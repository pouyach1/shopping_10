import mongoose, { type ConnectOptions } from 'mongoose';

import { env } from './env';
import {
  categorizeMongoError,
  sanitizeMongoUri,
} from './mongoSafety';
import { logger } from '../utils/logger';

let listenersAttached = false;
let mongooseConfigured = false;
let shuttingDown = false;
let connectInFlight: Promise<typeof mongoose> | null = null;

export type DbAvailability = 'available' | 'unavailable' | 'draining';

let lastAvailability: DbAvailability = 'unavailable';

/**
 * Index / schema creation policy.
 * Production must never drop or rebuild indexes on startup.
 */
export const INDEX_POLICY = {
  autoIndex: env.MONGODB_AUTO_INDEX,
  syncIndexesOnStartup: env.MONGODB_SYNC_INDEXES_ON_STARTUP,
  autoCreate: !env.isProd,
} as const;

function applyMongooseGlobals(): void {
  if (mongooseConfigured) return;
  mongooseConfigured = true;

  mongoose.set('autoIndex', INDEX_POLICY.autoIndex);
  mongoose.set('autoCreate', INDEX_POLICY.autoCreate);
  mongoose.set('bufferCommands', env.MONGODB_BUFFER_COMMANDS);

  if (env.isProd && INDEX_POLICY.autoIndex) {
    logger.warn(
      'MONGODB_AUTO_INDEX=true in production — prefer pre-created indexes; startup must not call syncIndexes',
    );
  }
}

function setAvailability(next: DbAvailability, reason?: string): void {
  if (lastAvailability === next) return;
  lastAvailability = next;
  logger.info('MongoDB availability changed', {
    dbAvailability: next,
    reason: reason ?? undefined,
    readyState: getDbState(),
  });
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    setAvailability(shuttingDown ? 'draining' : 'available', 'connected');
    logger.info('MongoDB connected', {
      host: sanitizeMongoUri(env.MONGODB_URI),
      appName: env.MONGODB_APP_NAME,
    });
  });

  mongoose.connection.on('reconnected', () => {
    if (shuttingDown) {
      setAvailability('draining', 'reconnected_during_shutdown');
      return;
    }
    setAvailability('available', 'reconnected');
    logger.info('MongoDB reconnected', {
      dbAvailability: 'available',
    });
  });

  mongoose.connection.on('error', (error: Error) => {
    const category = categorizeMongoError(error);
    logger.error('MongoDB connection error', {
      category,
      message: error.message,
      dbAvailability: lastAvailability,
    });
  });

  mongoose.connection.on('disconnected', () => {
    if (shuttingDown) {
      setAvailability('draining', 'disconnected_shutdown');
      return;
    }
    setAvailability('unavailable', 'disconnected');
    logger.warn('MongoDB disconnected', {
      dbAvailability: 'unavailable',
    });
  });
}

/**
 * Conservative production connection options.
 * Predictable behavior over maximum throughput.
 */
export function getMongoConnectOptions(): ConnectOptions {
  const options: ConnectOptions = {
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    minPoolSize: env.MONGODB_MIN_POOL_SIZE,
    maxIdleTimeMS: env.MONGODB_MAX_IDLE_TIME_MS,
    serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    connectTimeoutMS: env.MONGODB_CONNECT_TIMEOUT_MS,
    heartbeatFrequencyMS: env.MONGODB_HEARTBEAT_FREQUENCY_MS,
    appName: env.MONGODB_APP_NAME,
    autoIndex: INDEX_POLICY.autoIndex,
    autoCreate: INDEX_POLICY.autoCreate,
  };

  if (env.MONGODB_SOCKET_TIMEOUT_MS > 0) {
    options.socketTimeoutMS = env.MONGODB_SOCKET_TIMEOUT_MS;
  }

  return options;
}

/**
 * Connect once. Concurrent callers share the same in-flight promise.
 * Safe to call again after a successful connection (no-op reconnect via driver).
 * Never calls syncIndexes — production must not drop indexes on boot.
 */
export async function connectDB(
  uri = env.MONGODB_URI,
): Promise<typeof mongoose> {
  applyMongooseGlobals();
  attachListeners();

  if (INDEX_POLICY.syncIndexesOnStartup) {
    // Hard guard — must remain false. Destructive index sync is ops-only.
    throw new Error(
      'Refusing to start: MONGODB_SYNC_INDEXES_ON_STARTUP must remain false',
    );
  }

  if (mongoose.connection.readyState === 1) {
    setAvailability(shuttingDown ? 'draining' : 'available', 'already_connected');
    return mongoose;
  }

  if (connectInFlight) {
    return connectInFlight;
  }

  const options = getMongoConnectOptions();
  logger.info('MongoDB connecting', {
    target: sanitizeMongoUri(uri),
    maxPoolSize: options.maxPoolSize,
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
    autoIndex: INDEX_POLICY.autoIndex,
  });

  connectInFlight = mongoose
    .connect(uri, options)
    .then((conn) => {
      setAvailability(shuttingDown ? 'draining' : 'available', 'connect_ok');
      return conn;
    })
    .catch((error: unknown) => {
      setAvailability('unavailable', 'connect_failed');
      const category = categorizeMongoError(error);
      const message = error instanceof Error ? error.message : String(error);
      logger.error('MongoDB connect failed', {
        category,
        message,
        target: sanitizeMongoUri(uri),
        dbAvailability: 'unavailable',
      });
      throw error;
    })
    .finally(() => {
      connectInFlight = null;
    });

  return connectInFlight;
}

export async function disconnectDB(): Promise<void> {
  connectInFlight = null;
  if (mongoose.connection.readyState === 0) {
    setAvailability(shuttingDown ? 'draining' : 'unavailable', 'already_closed');
    return;
  }
  await mongoose.connection.close();
  setAvailability(shuttingDown ? 'draining' : 'unavailable', 'closed');
  logger.info('MongoDB connection closed', {
    dbAvailability: lastAvailability,
  });
}

/**
 * Mark the process as draining. READY must fail immediately.
 * Idempotent — safe if shutdown is invoked twice.
 */
export function beginShutdown(): void {
  shuttingDown = true;
  setAvailability('draining', 'shutdown');
}

export function isShuttingDown(): boolean {
  return shuttingDown;
}

/** Test-only reset so suite isolation does not leak draining state. */
export function resetDbLifecycleForTests(): void {
  shuttingDown = false;
  lastAvailability = mongoose.connection.readyState === 1 ? 'available' : 'unavailable';
  connectInFlight = null;
}

export function getDbAvailability(): DbAvailability {
  if (shuttingDown) return 'draining';
  return lastAvailability;
}

export function isDbReadyState(): boolean {
  return !shuttingDown && mongoose.connection.readyState === 1;
}

/**
 * Readiness probe: process not draining + driver connected + successful ping.
 * Never treats optional integrations as required.
 */
export async function checkDbReady(): Promise<boolean> {
  if (shuttingDown) return false;
  if (mongoose.connection.readyState !== 1) return false;

  const db = mongoose.connection.db;
  if (!db) return false;

  try {
    await Promise.race([
      db.admin().command({ ping: 1 }),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('MongoDB ping timeout')),
          env.MONGODB_PING_TIMEOUT_MS,
        );
      }),
    ]);
    if (lastAvailability !== 'available') {
      setAvailability('available', 'ping_ok');
    }
    return true;
  } catch (error) {
    const category = categorizeMongoError(error);
    logger.warn('MongoDB readiness ping failed', {
      category,
      message: error instanceof Error ? error.message : String(error),
      dbAvailability: 'unavailable',
    });
    setAvailability('unavailable', 'ping_failed');
    return false;
  }
}

/** Synchronous hint only — prefer checkDbReady() for probes. */
export function isDbReady(): boolean {
  return isDbReadyState();
}

export function getDbState():
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'disconnecting' {
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

/** Exposed for tests asserting listener idempotency. */
export function getMongoListenerCounts(): Record<string, number> {
  return {
    connected: mongoose.connection.listenerCount('connected'),
    reconnected: mongoose.connection.listenerCount('reconnected'),
    error: mongoose.connection.listenerCount('error'),
    disconnected: mongoose.connection.listenerCount('disconnected'),
  };
}
