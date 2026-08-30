import { randomUUID } from 'node:crypto';

import { env } from '../config/env';
import { logger } from '../utils/logger';
import { SchedulerLock } from '../models/SchedulerLock';
import { Store } from '../models/Store';
import { runWithTenantContext } from '../tenant/TenantContext';
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

async function renewLock(name: string): Promise<void> {
  const lockedUntil = new Date(Date.now() + LOCK_TTL_MS);
  await SchedulerLock.updateOne(
    { name, owner: INSTANCE_ID },
    { $set: { lockedUntil } },
  );
}

async function forEachActiveStore<T>(
  fn: () => Promise<T>,
  lockName?: string,
): Promise<T[]> {
  const stores = await Store.find({ status: 'active' })
    .select('_id slug')
    .lean();
  const results: T[] = [];
  for (const store of stores) {
    if (lockName) {
      await renewLock(lockName);
    }
    const result = await runWithTenantContext(
      {
        storeId: String(store._id),
        storeSlug: store.slug,
        storeStatus: 'active',
        resolution: 'explicit',
      },
      fn,
    );
    results.push(result);
  }
  return results;
}

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
    const storeResults = await forEachActiveStore(
      async () =>
        Promise.all([
          releaseExpiredReservations(50),
          recoverOrphanedInventoryHolds(50),
        ]),
      'reservation',
    );
    const result = storeResults.reduce(
      (acc, [reservations, holds]) => ({
        released: acc.released + reservations.released,
        holdsRecovered: acc.holdsRecovered + holds.recovered,
      }),
      { released: 0, holdsRecovered: 0 },
    );
    const holds = { recovered: result.holdsRecovered };
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
    const storeResults = await forEachActiveStore(
      () => processPendingNotifications(50),
      'notification',
    );
    const result = storeResults.reduce(
      (acc, row) => ({
        processed: acc.processed + row.processed,
        sent: acc.sent + row.sent,
        failed: acc.failed + row.failed,
      }),
      { processed: 0, sent: 0, failed: 0 },
    );
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
    const storeResults = await forEachActiveStore(
      () => reconcileOpenPayments(20, { applySafeFix: true }),
      'reconcile',
    );
    const result = storeResults.reduce(
      (acc, row) => ({
        scanned: acc.scanned + row.scanned,
        fixed: acc.fixed + row.fixed,
        reviews: acc.reviews + row.reviews,
      }),
      { scanned: 0, fixed: 0, reviews: 0 },
    );
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
