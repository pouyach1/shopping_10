import { randomUUID } from 'node:crypto';

import { env } from '../config/env';
import { logger } from '../utils/logger';
import { SchedulerLock } from '../models/SchedulerLock';
import { releaseExpiredReservations } from './payment.service';
import { processPendingNotifications } from './notifications';
import { recoverOrphanedInventoryHolds } from './inventoryHold.service';
import { reconcileOpenPayments } from './reconciliation.service';

let reservationTimer: NodeJS.Timeout | null = null;
let notificationTimer: NodeJS.Timeout | null = null;
let reconcileTimer: NodeJS.Timeout | null = null;
let reservationRunning = false;
let notificationRunning = false;
let reconcileRunning = false;

const INSTANCE_ID = `luxora-${process.pid}-${randomUUID().slice(0, 8)}`;
const LOCK_TTL_MS = 55_000;

export interface SchedulerHealth {
  instanceId: string;
  reservation: { enabled: boolean; lastTickAt?: string; lastResult?: unknown };
  notification: { enabled: boolean; lastTickAt?: string; lastResult?: unknown };
  reconcile: { enabled: boolean; lastTickAt?: string; lastResult?: unknown };
}

/**
 * In-process schedulers for modular monolith deployments.
 *
 * Multi-instance: each tick tries to claim a Mongo lease (`SchedulerLock`).
 * Only the winner runs the job. Still safe if two win briefly because
 * underlying operations use atomic claims.
 *
 * Production recommendation: either enable schedulers on one replica OR
 * hit admin cron endpoints (`release-expired`, `notifications/process`,
 * `payments/reconcile-open`).
 */
export function startCommerceSchedulers(): void {
  if (env.ENABLE_RESERVATION_SCHEDULER && !reservationTimer) {
    reservationTimer = setInterval(() => {
      void runReservationTick();
    }, env.RESERVATION_SCHEDULER_INTERVAL_MS);
    reservationTimer.unref?.();
    logger.info('scheduler.reservation.started', {
      intervalMs: env.RESERVATION_SCHEDULER_INTERVAL_MS,
    });
  }

  if (env.ENABLE_NOTIFICATION_SCHEDULER && !notificationTimer) {
    notificationTimer = setInterval(() => {
      void runNotificationTick();
    }, env.NOTIFICATION_SCHEDULER_INTERVAL_MS);
    notificationTimer.unref?.();
    logger.info('scheduler.notification.started', {
      intervalMs: env.NOTIFICATION_SCHEDULER_INTERVAL_MS,
    });
  }

  if (env.ENABLE_RECONCILE_SCHEDULER && !reconcileTimer) {
    reconcileTimer = setInterval(() => {
      void runReconcileTick();
    }, env.RECONCILE_SCHEDULER_INTERVAL_MS);
    reconcileTimer.unref?.();
    logger.info('scheduler.reconcile.started', {
      intervalMs: env.RECONCILE_SCHEDULER_INTERVAL_MS,
    });
  }
}

export function stopCommerceSchedulers(): void {
  if (reservationTimer) {
    clearInterval(reservationTimer);
    reservationTimer = null;
  }
  if (notificationTimer) {
    clearInterval(notificationTimer);
    notificationTimer = null;
  }
  if (reconcileTimer) {
    clearInterval(reconcileTimer);
    reconcileTimer = null;
  }
}

async function tryAcquireLock(name: string): Promise<boolean> {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + LOCK_TTL_MS);

  // Steal expired or missing lock.
  const stolen = await SchedulerLock.findOneAndUpdate(
    {
      name,
      $or: [{ lockedUntil: { $lte: now } }, { lockedUntil: { $exists: false } }],
    },
    {
      $set: { owner: INSTANCE_ID, lockedUntil },
    },
    { returnDocument: 'after' },
  );
  if (stolen?.owner === INSTANCE_ID) return true;

  try {
    await SchedulerLock.create({
      name,
      owner: INSTANCE_ID,
      lockedUntil,
    });
    return true;
  } catch {
    // Another instance holds a non-expired lock.
    return false;
  }
}

async function recordTick(
  name: string,
  result: Record<string, unknown>,
): Promise<void> {
  await SchedulerLock.updateOne(
    { name, owner: INSTANCE_ID },
    { $set: { lastTickAt: new Date(), lastResult: result } },
  );
}

export async function runReservationTick(): Promise<void> {
  if (reservationRunning) return;
  reservationRunning = true;
  try {
    if (!(await tryAcquireLock('reservation'))) return;
    const [result, holds] = await Promise.all([
      releaseExpiredReservations(50),
      recoverOrphanedInventoryHolds(50),
    ]);
    const payload = {
      released: result.released,
      holdsRecovered: holds.recovered,
    };
    await recordTick('reservation', payload);
    if (result.released > 0 || holds.recovered > 0) {
      logger.info('scheduler.reservation.tick', payload);
    }
  } catch (error) {
    logger.error('scheduler.reservation.failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  } finally {
    reservationRunning = false;
  }
}

export async function runNotificationTick(): Promise<void> {
  if (notificationRunning) return;
  notificationRunning = true;
  try {
    if (!(await tryAcquireLock('notification'))) return;
    const result = await processPendingNotifications(50);
    await recordTick('notification', result);
    if (result.processed > 0) {
      logger.info('scheduler.notification.tick', result);
    }
  } catch (error) {
    logger.error('scheduler.notification.failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  } finally {
    notificationRunning = false;
  }
}

export async function runReconcileTick(): Promise<void> {
  if (reconcileRunning) return;
  reconcileRunning = true;
  try {
    if (!(await tryAcquireLock('reconcile'))) return;
    const result = await reconcileOpenPayments(20, { applySafeFix: true });
    await recordTick('reconcile', result);
    if (result.scanned > 0) {
      logger.info('scheduler.reconcile.tick', result);
    }
  } catch (error) {
    logger.error('scheduler.reconcile.failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  } finally {
    reconcileRunning = false;
  }
}

export async function getSchedulerHealth(): Promise<SchedulerHealth> {
  const locks = await SchedulerLock.find({
    name: { $in: ['reservation', 'notification', 'reconcile'] },
  }).lean();
  const byName = new Map(locks.map((l) => [l.name, l]));

  const map = (name: string, enabled: boolean) => {
    const lock = byName.get(name);
    return {
      enabled,
      lastTickAt: lock?.lastTickAt?.toISOString(),
      lastResult: lock?.lastResult,
    };
  };

  return {
    instanceId: INSTANCE_ID,
    reservation: map('reservation', env.ENABLE_RESERVATION_SCHEDULER),
    notification: map('notification', env.ENABLE_NOTIFICATION_SCHEDULER),
    reconcile: map('reconcile', env.ENABLE_RECONCILE_SCHEDULER),
  };
}
