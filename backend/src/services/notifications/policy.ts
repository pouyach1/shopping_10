/**
 * Centralized mapping: commerce domain event → notification channels.
 * Commerce services emit events; this policy decides what to send.
 */
import type { CommerceEventType } from '../../config/constants';

export type NotificationChannelPlan = 'sms' | 'email';

export interface NotificationPlan {
  channels: NotificationChannelPlan[];
}

const POLICY: Partial<Record<CommerceEventType, NotificationPlan>> = {
  OrderCreated: { channels: ['email'] },
  PaymentPending: { channels: ['email'] },
  PaymentSuccessful: { channels: ['sms', 'email'] },
  PaymentFailed: { channels: ['email'] },
  OrderCancelled: { channels: ['email'] },
  OrderShipped: { channels: ['sms', 'email'] },
  OrderDelivered: { channels: ['email'] },
  RefundCreated: { channels: ['email'] },
  RefundSuccessful: { channels: ['sms', 'email'] },
  RefundFailed: { channels: ['email'] },
};

export function channelsForEvent(
  event: CommerceEventType,
): NotificationChannelPlan[] {
  return POLICY[event]?.channels ?? [];
}
