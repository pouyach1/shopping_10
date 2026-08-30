import type { CommerceEventType } from '../../config/constants';
import { logger } from '../../utils/logger';
import {
  enqueueNotificationsForEvent,
  processPendingNotifications,
} from './delivery.service';

export interface CommerceEventPayload {
  orderNumber?: string;
  userId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface NotificationProvider {
  readonly id: string;
  notify(
    event: CommerceEventType,
    payload: CommerceEventPayload,
  ): Promise<void>;
}

/** In-memory test double — records events for assertions. */
export class MockNotificationProvider implements NotificationProvider {
  readonly id = 'mock';
  readonly sent: Array<{ event: CommerceEventType; payload: CommerceEventPayload }> =
    [];

  async notify(
    event: CommerceEventType,
    payload: CommerceEventPayload,
  ): Promise<void> {
    this.sent.push({ event, payload });
    logger.info('notification.mock', { event, orderNumber: payload.orderNumber });
  }
}

type Listener = (
  event: CommerceEventType,
  payload: CommerceEventPayload,
) => void | Promise<void>;

const listeners: Listener[] = [];
let defaultProvider: NotificationProvider = new MockNotificationProvider();
let enqueueEnabled = true;

export function setNotificationProvider(provider: NotificationProvider): void {
  defaultProvider = provider;
}

export function getNotificationProvider(): NotificationProvider {
  return defaultProvider;
}

export function setEnqueueEnabled(enabled: boolean): void {
  enqueueEnabled = enabled;
}

export function onCommerceEvent(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Fire-and-forget commerce domain events.
 * Order/Payment services must not await SMS/email providers.
 * Delivery is enqueued with idempotent keys, then processed asynchronously.
 */
export function emitCommerceEvent(
  event: CommerceEventType,
  payload: CommerceEventPayload,
): void {
  void defaultProvider.notify(event, payload).catch((error) => {
    logger.error('notification.provider_failed', {
      event,
      error: error instanceof Error ? error.message : 'unknown',
    });
  });

  if (enqueueEnabled) {
    void enqueueNotificationsForEvent(event, payload)
      .then(() => processPendingNotifications(20))
      .catch((error) => {
        logger.error('notification.enqueue_failed', {
          event,
          error: error instanceof Error ? error.message : 'unknown',
        });
      });
  }

  for (const listener of listeners) {
    void Promise.resolve(listener(event, payload)).catch((error) => {
      logger.error('notification.listener_failed', {
        event,
        error: error instanceof Error ? error.message : 'unknown',
      });
    });
  }
}

export {
  processPendingNotifications,
  enqueueNotificationsForEvent,
  listAdminNotifications,
  retryNotificationDelivery,
  getSmsProvider,
  getEmailProvider,
  setSmsProvider,
  setEmailProvider,
  resetNotificationProviders,
} from './delivery.service';
export { channelsForEvent } from './policy';
