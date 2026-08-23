import express from 'express';
import type { Application } from 'express';
import routes from './routes';
import { notFound, errorHandler } from './middleware/errorHandler';

/**
 * Builds and configures the Express application (no network binding here, so it
 * stays easy to test/import). All feature routes live under the `/api` prefix.
 */
export function createApp(): Application {
  const app = express();

  app.use(express.json());

  app.use('/api', routes);

  // 404 + error handling must be registered last.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
