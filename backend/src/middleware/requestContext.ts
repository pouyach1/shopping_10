import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { env } from '../config/env';
import { forbidden } from '../utils/AppError';
import { runWithRequestContext } from '../utils/requestContext';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    /** True when auth came from Authorization Bearer (not cookie). */
    authViaBearer?: boolean;
    rawBody?: string;
  }
}

/**
 * Correlate logs and responses. Prefer inbound X-Request-Id when well-formed.
 * Runs the rest of the request inside AsyncLocalStorage so services/audit see it.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const inbound = req.header('x-request-id');
  const id =
    inbound && /^[\w-]{8,128}$/.test(inbound) ? inbound : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  runWithRequestContext({ requestId: id }, next);
}

/**
 * CSRF defense for cookie-authenticated browser clients.
 *
 * Model:
 * - Bearer Authorization: trusted API clients — no Origin check.
 * - Cookie session on state-changing methods: Origin/Referer must match
 *   CLIENT_ORIGINS (or be absent only for same-site navigations we reject
 *   for mutations — require Origin or Referer).
 * - sameSite=lax cookies (default) block most cross-site POSTs already.
 *
 * Does not break Bearer-token clients (tests, mobile, server-to-server).
 */
export function csrfCookieGuard(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ') && header.slice(7).trim()) {
    req.authViaBearer = true;
    next();
    return;
  }

  const cookieToken = req.cookies?.[env.AUTH_COOKIE_NAME];
  if (!cookieToken) {
    next();
    return;
  }

  const origin = req.header('origin');
  const referer = req.header('referer');
  let candidate = origin;
  if (!candidate && referer) {
    try {
      candidate = new URL(referer).origin;
    } catch {
      candidate = undefined;
    }
  }

  if (!candidate) {
    next(
      forbidden(
        'درخواست کوکی بدون Origin معتبر رد شد.',
      ),
    );
    return;
  }

  if (!env.CLIENT_ORIGINS.includes(candidate)) {
    next(forbidden('مبدا درخواست مجاز نیست.'));
    return;
  }

  next();
}
