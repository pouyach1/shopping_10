import type { Request, Response, NextFunction } from 'express';

/**
 * Fallback 404 handler for unmatched routes.
 */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ status: 'error', message: 'Not Found' });
}

/**
 * Centralized error handler. Express recognizes it as an error middleware
 * because of its four-argument signature (`next` is required for that even
 * though it is unused here).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  console.error('[error]', message);
  res.status(500).json({ status: 'error', message });
}
