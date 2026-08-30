import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Application } from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import routes from './routes';
import { apiRateLimiter, errorHandler, notFound } from './middleware/errorHandler';

/**
 * Builds the Express application without binding a port (test-friendly).
 */
export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Non-browser clients (curl, server-to-server, tests) send no Origin.
        if (!origin) {
          callback(null, true);
          return;
        }
        if (env.CLIENT_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin not allowed by CORS'));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
  app.use(cookieParser());
  if (!env.isTest) {
    app.use(apiRateLimiter);
  }

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
