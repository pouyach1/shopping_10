import http from 'node:http';

import { createApp } from './app';
import {
  beginShutdown,
  connectDB,
  disconnectDB,
  INDEX_POLICY,
} from './config/db';
import { env } from './config/env';
import { sanitizeMongoUri } from './config/mongoSafety';
import { logger } from './utils/logger';

let server: http.Server | null = null;
let shuttingDown = false;

async function start(): Promise<void> {
  if (INDEX_POLICY.syncIndexesOnStartup) {
    logger.error(
      'Refusing to boot: destructive index sync on startup is disabled by policy',
    );
    process.exit(1);
  }

  const app = createApp();

  try {
    await connectDB();
    logger.info('MongoDB ready for commerce traffic', {
      target: sanitizeMongoUri(env.MONGODB_URI),
      autoIndex: INDEX_POLICY.autoIndex,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (env.isProd) {
      // Production: fail fast — do not accept traffic without Mongo.
      logger.error(`MongoDB connection failed in production: ${message}`);
      process.exit(1);
    }
    // Development: process may stay alive; READY must report not_ready.
    logger.warn(`Could not connect to MongoDB: ${message}`);
    logger.warn(
      'Server will start; /api/v1/health/ready will report not_ready until Mongo is available.',
    );
  }

  server = app.listen(env.PORT, () => {
    logger.info(
      `Backend listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
    logger.info('Health: GET /api/v1/health (liveness)');
    logger.info('Ready:  GET /api/v1/health/ready (Mongo + not draining)');
  });
}

/**
 * Graceful shutdown order:
 * 1. Mark not ready (stop new commerce routing via probes)
 * 2. Stop accepting new HTTP connections
 * 3. Allow in-flight HTTP to finish (bounded)
 * 4. Disconnect MongoDB
 * 5. Exit cleanly
 *
 * No payment/order workers exist yet — when added, stop them between steps 1–3.
 */
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  beginShutdown();
  logger.info(`Received ${signal} — shutting down gracefully`, {
    timeoutMs: env.SHUTDOWN_TIMEOUT_MS,
  });

  const forceTimer = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
      logger.info('HTTP server closed');
    }

    // Future: stop schedulers / payment workers here before Mongo disconnect.

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Shutdown error: ${message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('unhandledRejection', (reason) => {
  logger.error(
    'Unhandled promise rejection',
    reason instanceof Error ? reason.message : String(reason),
  );
  if (env.isProd) {
    void shutdown('unhandledRejection');
  }
});

void start();
