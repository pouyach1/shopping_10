import http from 'node:http';

import { createApp } from './app';
import { connectDB, disconnectDB, isDbReady } from './config/db';
import { env } from './config/env';
import {
  startCommerceSchedulers,
  stopCommerceSchedulers,
} from './services/scheduler';
import { logger } from './utils/logger';

let server: http.Server | null = null;
let shuttingDown = false;

/** Exported for tests — whether a shutdown is in progress. */
export function isShuttingDown(): boolean {
  return shuttingDown;
}

export async function start(): Promise<http.Server> {
  const app = createApp();

  try {
    await connectDB();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (env.isProd) {
      logger.error('mongodb.startup_failed', {
        message: message.slice(0, 200),
      });
      process.exit(1);
    }
    logger.warn('mongodb.startup_deferred', {
      message: message.slice(0, 200),
      note: 'Server will start; /api/v1/health/ready will report not_ready.',
    });
  }

  // Only start background commerce workers when DB connected at boot.
  // If Mongo was unavailable, schedulers stay off until process restart
  // (READY already fails; running workers against a down DB is unsafe).
  if (env.isProd || isDbReady()) {
    startCommerceSchedulers();
  }

  server = app.listen(env.PORT, () => {
    logger.info('server.listening', {
      port: env.PORT,
      env: env.NODE_ENV,
    });
  });

  return server;
}

/**
 * Graceful shutdown:
 * 1. stop accepting new HTTP requests
 * 2. stop schedulers/workers
 * 3. allow in-flight work to finish (bounded)
 * 4. disconnect MongoDB
 * 5. exit cleanly
 */
export async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('server.shutdown_begin', { signal });

  const forceTimer = setTimeout(() => {
    logger.error('server.shutdown_forced', {
      timeoutMs: env.SHUTDOWN_TIMEOUT_MS,
    });
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();

  try {
    // 1) Stop accepting new connections / requests
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
      logger.info('server.http_closed');
    }

    // 2) Stop schedulers so no new ticks start
    stopCommerceSchedulers();
    logger.info('server.schedulers_stopped');

    // 3) Brief drain for in-flight service work (bounded above by force timer)
    await new Promise((resolve) => setTimeout(resolve, 250));

    // 4) Disconnect Mongo
    await disconnectDB();

    clearTimeout(forceTimer);
    logger.info('server.shutdown_complete', { signal });
    if (!env.isTest) {
      process.exit(0);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('server.shutdown_error', { message: message.slice(0, 200) });
    if (!env.isTest) {
      process.exit(1);
    }
    throw error;
  }
}

if (!env.isTest) {
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled_rejection', {
      message:
        reason instanceof Error ? reason.message.slice(0, 200) : String(reason),
    });
    if (env.isProd) {
      void shutdown('unhandledRejection');
    }
  });

  void start();
}
