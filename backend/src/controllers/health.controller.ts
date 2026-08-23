import type { Request, Response } from 'express';
import mongoose from 'mongoose';

// Mongoose connection.readyState codes mapped to human-readable labels.
const DB_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

/**
 * GET /api/health
 * Lightweight liveness/readiness probe. Always returns 200 while the process is
 * up, and reports the current MongoDB connection state so callers can tell
 * whether the database is reachable.
 */
export function getHealth(_req: Request, res: Response): void {
  const db = DB_STATES[mongoose.connection.readyState] ?? 'unknown';

  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db,
  });
}
