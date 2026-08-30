import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import {
  checkDbReady,
  getDbAvailability,
  getDbState,
  isShuttingDown,
} from '../config/db';
import { env } from '../config/env';
import {
  categorizeMongoError,
  isMongoUnavailableError,
} from '../config/mongoSafety';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'مسیر درخواستی یافت نشد.', { code: 'NOT_FOUND' }));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    const appError = err;
    if (appError.statusCode >= 500) {
      logger.error(appError.message, { requestId });
    }

    res.status(appError.statusCode).json({
      status: 'error',
      code: appError.code,
      message: appError.message,
      ...(appError.errors ? { errors: appError.errors } : {}),
      ...(requestId ? { requestId } : {}),
    });
    return;
  }

  // Mongoose duplicate key
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  ) {
    res.status(409).json({
      status: 'error',
      code: 'CONFLICT',
      message: 'رکورد تکراری است.',
      ...(requestId ? { requestId } : {}),
    });
    return;
  }

  if (isMongoUnavailableError(err)) {
    const category = categorizeMongoError(err);
    logger.error('MongoDB unavailable during request', {
      requestId,
      category,
      operation: 'http_request',
      dbAvailability: getDbAvailability(),
      message: err instanceof Error ? err.message : undefined,
    });
    res.status(503).json({
      status: 'error',
      code: 'SERVICE_UNAVAILABLE',
      message: 'سرویس موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.',
      ...(requestId ? { requestId } : {}),
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  logger.error('Unhandled error', {
    requestId,
    category: categorizeMongoError(err),
    message: env.isProd ? undefined : message,
  });

  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: env.isProd
      ? 'خطای داخلی سرور رخ داد.'
      : message || 'Internal Server Error',
    ...(requestId ? { requestId } : {}),
  });
}

export const apiRateLimiter = rateLimit({
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  max: env.API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
  },
});

export const authRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'تلاش‌های ورود بیش از حد است. کمی بعد دوباره تلاش کنید.',
  },
});

/**
 * LIVE — Node process is alive.
 * Does not check MongoDB. Used by orchestrators for restart decisions.
 */
export function healthLive(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    service: 'luxora-backend',
    uptime: process.uptime(),
    draining: isShuttingDown(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * READY — application can safely serve required commerce operations.
 * Requires: not shutting down + MongoDB connected + successful ping.
 * Optional integrations (notifications, etc.) do not block readiness.
 */
export async function healthReady(
  _req: Request,
  res: Response,
): Promise<void> {
  const db = getDbState();
  const dbAvailability = getDbAvailability();
  const ready = await checkDbReady();
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    db,
    dbAvailability,
    draining: isShuttingDown(),
    timestamp: new Date().toISOString(),
  });
}
