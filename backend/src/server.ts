import http from 'node:http';

import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

let server: http.Server | null = null;
let shuttingDown = false;

async function start(): Promise<void> {
  const app = createApp();

  try {
    await connectDB();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (env.isProd) {
      logger.error(`MongoDB connection failed in production: ${message}`);
      process.exit(1);
    }
    logger.warn(`Could not connect to MongoDB: ${message}`);
    logger.warn('Server will start; /api/v1/health/ready will report not_ready.');
  }

  server = app.listen(env.PORT, () => {
    logger.info(
      `Backend listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
    logger.info(`Health: GET /api/v1/health`);
    logger.info(`Ready:  GET /api/v1/health/ready`);
  });
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal} — shutting down gracefully`);

  const forceTimer = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
      logger.info('HTTP server closed');
    }
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
