import { env } from '../config/env';
import { logger } from '../utils/logger';
import { releaseExpiredReservations } from './payment.service';
import { processPendingNotifications } from './notifications';

let reservationTimer: NodeJS.Timeout | null = null;
let notificationTimer: NodeJS.Timeout | null = null;
let reservationRunning = false;
let notificationRunning = false;

/**
 * In-process schedulers for modular monolith deployments.
 * Safe if the interval fires twice (guards + idempotent service methods).
 * For multi-instance production, run only one replica with schedulers enabled
 * or invoke the admin/internal endpoints from an external cron.
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
}

export async function runReservationTick(): Promise<void> {
  if (reservationRunning) return;
  reservationRunning = true;
  try {
    const result = await releaseExpiredReservations(50);
    if (result.released > 0) {
      logger.info('scheduler.reservation.tick', result);
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
    const result = await processPendingNotifications(50);
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
