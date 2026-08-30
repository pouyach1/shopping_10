import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { getDbState } from '../config/db';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'مسیر درخواستی یافت نشد.', { code: 'NOT_FOUND' }));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const appError = err;
    if (appError.statusCode >= 500) {
      logger.error(appError.message);
    }

    res.status(appError.statusCode).json({
      status: 'error',
      code: appError.code,
      message: appError.message,
      ...(appError.errors ? { errors: appError.errors } : {}),
      ...(appError.details !== undefined ? { details: appError.details } : {}),
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
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  logger.error('Unhandled error', env.isProd ? undefined : message);

  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: env.isProd
      ? 'خطای داخلی سرور رخ داد.'
      : message || 'Internal Server Error',
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

export function healthLive(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    service: 'luxora-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

export function healthReady(_req: Request, res: Response): void {
  const db = getDbState();
  const ready = db === 'connected';
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    db,
    timestamp: new Date().toISOString(),
  });
}
