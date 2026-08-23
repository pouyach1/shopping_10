import { createApp } from './app';
import { env } from './config/env';
import { connectDB } from './config/db';

/**
 * Process entry point: create the app, attempt the DB connection, then start
 * listening. A failed DB connection is logged but non-fatal so the API (and the
 * /api/health probe) still comes up and can report the database as unavailable.
 */
async function start(): Promise<void> {
  const app = createApp();

  try {
    await connectDB();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[startup] Could not connect to MongoDB: ${message}`);
    console.warn('[startup] Server will start; /api/health will report db as disconnected.');
  }

  app.listen(env.PORT, () => {
    console.log(`[startup] Backend listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    console.log(`[startup] Health check: GET http://localhost:${env.PORT}/api/health`);
  });
}

void start();
