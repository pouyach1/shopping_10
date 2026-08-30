import { randomUUID } from 'node:crypto';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import routes from './routes';
import { apiRateLimiter, errorHandler, notFound } from './middleware/errorHandler';

function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.header('x-request-id')?.trim();
  const requestId =
    incoming && incoming.length > 0 && incoming.length <= 128
      ? incoming
      : randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

/**
 * Builds the Express application without binding a port (test-friendly).
 *
 * Middleware order:
 * requestId → helmet/cors/json/cookies → rate limit → /api routes
 * Inside versioned routers: resolveTenant → auth → membership → authz → controller
 * Health routes skip tenant resolution.
 */
export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestIdMiddleware);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
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
