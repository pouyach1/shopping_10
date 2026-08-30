import mongoose from 'mongoose';

import { env } from './env';
import { logger } from '../utils/logger';

let listenersAttached = false;
let connectPromise: Promise<typeof mongoose> | null = null;

/**
 * Strip credentials from a MongoDB URI for safe logging.
 * Never log the raw URI.
 */
export function sanitizeMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.username || parsed.password) {
      parsed.username = parsed.username ? '***' : '';
      parsed.password = parsed.password ? '***' : '';
    }
    return parsed.toString();
  } catch {
    // Non-URL forms (e.g. malformed) — redact anything that looks like user:pass@
    return uri.replace(/\/\/([^/@]+)@/g, '//***@');
  }
}

function mongoErrorCategory(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UNKNOWN';
  const err = error as { name?: string; code?: number | string; message?: string };
  if (err.name === 'MongoServerSelectionError') return 'SERVER_SELECTION';
  if (err.name === 'MongoNetworkError') return 'NETWORK';
  if (err.name === 'MongoNetworkTimeoutError') return 'NETWORK_TIMEOUT';
  if (err.name === 'MongoParseError') return 'URI_PARSE';
  if (err.code === 11000) return 'DUPLICATE_KEY';
  if (typeof err.message === 'string' && /timed?\s*out/i.test(err.message)) {
    return 'TIMEOUT';
  }
  return err.name ?? 'MONGO_ERROR';
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    logger.info('mongodb.connected', {
      db: mongoose.connection.name,
      host: mongoose.connection.host,
    });
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('mongodb.reconnected', {
      db: mongoose.connection.name,
    });
  });
  mongoose.connection.on('error', (error: Error) => {
    logger.error('mongodb.connection_error', {
      category: mongoErrorCategory(error),
      message: error.message.slice(0, 200),
    });
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('mongodb.disconnected');
  });
}

/** Test helper — allow re-attaching after forced disconnect suites. */
export function resetDbListenerGuardForTests(): void {
  if (!env.isTest) return;
  listenersAttached = false;
  connectPromise = null;
}

function applyMongooseGlobals(): void {
  // Production: never auto-build or syncIndexes (syncIndexes can DROP indexes).
  // Dev/test: autoIndex helps local iteration; tests also call createIndexes explicitly.
  mongoose.set('autoIndex', env.MONGODB_AUTO_INDEX);
  // Fail fast when disconnected instead of buffering forever (avoids false hangs).
  mongoose.set('bufferCommands', env.isProd ? false : true);
}

export function buildMongoConnectOptions(): mongoose.ConnectOptions {
  return {
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    minPoolSize: env.MONGODB_MIN_POOL_SIZE,
    maxIdleTimeMS: env.MONGODB_MAX_IDLE_MS,
    serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    connectTimeoutMS: env.MONGODB_CONNECT_TIMEOUT_MS,
    socketTimeoutMS: env.MONGODB_SOCKET_TIMEOUT_MS,
    heartbeatFrequencyMS: env.MONGODB_HEARTBEAT_FREQUENCY_MS,
    // Prefer majority for money-sensitive writes when a replica set is available.
    // Standalone (dev/memory) ignores this safely.
    ...(env.isProd
      ? {
          retryWrites: true,
          w: 'majority' as const,
        }
      : {}),
  };
}

/**
 * Connect once. Concurrent callers share the same in-flight promise.
 * Does not log the URI (credentials never appear in logs).
 */
export async function connectDB(
  uri = env.MONGODB_URI,
): Promise<typeof mongoose> {
  applyMongooseGlobals();
  attachListeners();

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (connectPromise) {
    return connectPromise;
  }

  const safeTarget = sanitizeMongoUri(uri);
  logger.info('mongodb.connecting', {
    target: safeTarget,
    autoIndex: env.MONGODB_AUTO_INDEX,
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
  });

  connectPromise = mongoose
    .connect(uri, buildMongoConnectOptions())
    .then(async (conn) => {
      if (env.MONGODB_AUTO_INDEX) {
        await ensureIndexes({ mode: 'create' });
      }
      return conn;
    })
    .catch((error: unknown) => {
      connectPromise = null;
      logger.error('mongodb.connect_failed', {
        category: mongoErrorCategory(error),
        target: safeTarget,
        message:
          error instanceof Error ? error.message.slice(0, 200) : 'unknown',
      });
      throw error;
    });

  return connectPromise;
}

/**
 * Create indexes non-destructively (never drops).
 * Production startup should leave MONGODB_AUTO_INDEX=false and run this
 * via an explicit ops/migration step when schemas change.
 */
export async function ensureIndexes(options?: {
  mode?: 'create';
}): Promise<{ models: number }> {
  const mode = options?.mode ?? 'create';
  if (mode !== 'create') {
    throw new Error('Destructive index modes are not supported');
  }
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Cannot ensure indexes while MongoDB is not connected');
  }

  const modelNames = Object.keys(mongoose.models);
  for (const name of modelNames) {
    await mongoose.models[name].createIndexes();
  }
  logger.info('mongodb.indexes_ensured', {
    models: modelNames.length,
    mode: 'create',
  });
  return { models: modelNames.length };
}

/**
 * NEVER call syncIndexes in production — it drops indexes absent from the schema.
 * Exposed only for tests that need a clean index set against MongoMemoryServer.
 */
export async function syncIndexesForTestsOnly(): Promise<void> {
  if (!env.isTest) {
    throw new Error('syncIndexesForTestsOnly is forbidden outside NODE_ENV=test');
  }
  await mongoose.connection.syncIndexes();
}

export async function disconnectDB(): Promise<void> {
  connectPromise = null;
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
  logger.info('mongodb.connection_closed');
}

export function isDbReady(): boolean {
  return mongoose.connection.readyState === 1;
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

/**
 * Active readiness probe — readyState alone is insufficient if the primary is gone.
 */
export async function pingMongo(
  timeoutMs = env.MONGODB_PING_TIMEOUT_MS,
): Promise<{ ok: boolean; latencyMs?: number; category?: string }> {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return { ok: false, category: 'NOT_CONNECTED' };
  }

  const started = Date.now();
  try {
    const ping = mongoose.connection.db.admin().ping();
    const timed = await Promise.race([
      ping.then(() => true),
      new Promise<false>((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
    if (!timed) {
      return { ok: false, category: 'PING_TIMEOUT', latencyMs: Date.now() - started };
    }
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      ok: false,
      category: mongoErrorCategory(error),
      latencyMs: Date.now() - started,
    };
  }
}

export async function checkDbReady(): Promise<{
  ready: boolean;
  state: ReturnType<typeof getDbState>;
  ping?: Awaited<ReturnType<typeof pingMongo>>;
}> {
  const state = getDbState();
  if (state !== 'connected') {
    return { ready: false, state };
  }
  const ping = await pingMongo();
  return { ready: ping.ok, state, ping };
}
