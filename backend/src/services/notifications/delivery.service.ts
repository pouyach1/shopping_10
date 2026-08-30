import { User } from '../../models/User';
import {
  NotificationDelivery,
  buildDeliveryKey,
} from '../../models/NotificationDelivery';
import type { CommerceEventType } from '../../config/constants';
import { env } from '../../config/env';
import { recordAudit } from '../audit.service';
import { logger } from '../../utils/logger';
import type { CommerceEventPayload } from './index';
import {
  KavenegarSmsProvider,
  MockSmsProvider,
  type SmsProvider,
} from './sms';
import {
  MockEmailProvider,
  SmtpEmailProvider,
  type EmailProvider,
} from './email';

let smsProvider: SmsProvider = createSmsProvider();
let emailProvider: EmailProvider = createEmailProvider();

function createSmsProvider(): SmsProvider {
  if (env.SMS_PROVIDER === 'kavenegar') {
    return new KavenegarSmsProvider(env.SMS_API_KEY ?? '');
  }
  return new MockSmsProvider();
}

function createEmailProvider(): EmailProvider {
  if (env.EMAIL_PROVIDER === 'smtp') {
    return new SmtpEmailProvider(env.EMAIL_FROM);
  }
  return new MockEmailProvider();
}

export function getSmsProvider(): SmsProvider {
  return smsProvider;
}

export function getEmailProvider(): EmailProvider {
  return emailProvider;
}

export function setSmsProvider(provider: SmsProvider): void {
  smsProvider = provider;
}

export function setEmailProvider(provider: EmailProvider): void {
  emailProvider = provider;
}

export function resetNotificationProviders(): void {
  smsProvider = createSmsProvider();
  emailProvider = createEmailProvider();
}

function messageForEvent(
  event: CommerceEventType,
  payload: CommerceEventPayload,
): { subject: string; body: string } {
  const order = payload.orderNumber ?? '';
  switch (event) {
    case 'PaymentSuccessful':
      return {
        subject: 'پرداخت موفق لوکسورا',
        body: `پرداخت سفارش ${order} با موفقیت انجام شد.`,
      };
    case 'PaymentFailed':
      return {
        subject: 'پرداخت ناموفق',
        body: `پرداخت سفارش ${order} انجام نشد.`,
      };
    case 'PaymentPending':
      return {
        subject: 'در انتظار پرداخت',
        body: `سفارش ${order} در انتظار پرداخت است.`,
      };
    case 'OrderCreated':
      return {
        subject: 'ثبت سفارش',
        body: `سفارش ${order} ثبت شد.`,
      };
    case 'OrderCancelled':
      return {
        subject: 'لغو سفارش',
        body: `سفارش ${order} لغو شد.`,
      };
    case 'OrderShipped':
      return {
        subject: 'ارسال سفارش',
        body: `سفارش ${order} ارسال شد.`,
      };
    case 'OrderDelivered':
      return {
        subject: 'تحویل سفارش',
        body: `سفارش ${order} تحویل داده شد.`,
      };
    case 'RefundCreated':
    case 'RefundSuccessful':
      return {
        subject: 'بازپرداخت',
        body: `بازپرداخت سفارش ${order} ثبت شد.`,
      };
    case 'RefundFailed':
      return {
        subject: 'خطای بازپرداخت',
        body: `بازپرداخت سفارش ${order} ناموفق بود.`,
      };
    default:
      return { subject: 'اعلان لوکسورا', body: `رویداد ${event}` };
  }
}

/**
 * Enqueue SMS/email deliveries with deterministic keys.
 * Duplicate events (callback+webhook) share the same deliveryKey → one send.
 */
export async function enqueueNotificationsForEvent(
  event: CommerceEventType,
  payload: CommerceEventPayload,
): Promise<void> {
  if (!payload.userId && !payload.orderNumber) return;

  let phone: string | undefined;
  let email: string | undefined;
  if (payload.userId) {
    const user = await User.findById(payload.userId).select('phone email');
    phone = user?.phone;
    email = user?.email;
  }

  const { subject, body } = messageForEvent(event, payload);
  const entityId =
    payload.paymentId ?? payload.orderNumber ?? payload.userId ?? 'unknown';

  const jobs: Array<{
    channel: 'sms' | 'email';
    recipient: string;
  }> = [];

  if (phone) jobs.push({ channel: 'sms', recipient: phone });
  if (email) jobs.push({ channel: 'email', recipient: email });

  // Always enqueue at least an email-shaped operational record when no contact —
  // skip quietly if neither contact exists.
  for (const job of jobs) {
    const deliveryKey = buildDeliveryKey({
      event,
      channel: job.channel,
      recipient: job.recipient,
      entityId,
    });
    try {
      await NotificationDelivery.create({
        deliveryKey,
        event,
        channel: job.channel,
        recipient: job.recipient,
        userId: payload.userId,
        orderNumber: payload.orderNumber,
        paymentId: payload.paymentId,
        subject,
        body,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: new Date(),
      });
    } catch {
      // Unique deliveryKey — duplicate event, idempotent no-op.
      logger.info('notification.duplicate_suppressed', {
        deliveryKey,
        event,
      });
    }
  }
}

const NOTIFICATION_LEASE_MS = 60_000;

export async function processPendingNotifications(
  limit = 50,
): Promise<{ processed: number; sent: number; failed: number }> {
  const now = new Date();
  let sent = 0;
  let failed = 0;
  let processed = 0;

  for (let i = 0; i < limit; i += 1) {
    // Claim one delivery with a lease so two workers cannot send the same row.
    const delivery = await NotificationDelivery.findOneAndUpdate(
      {
        status: { $in: ['pending', 'retryable'] },
        $and: [
          {
            $or: [{ nextAttemptAt: { $lte: now } }, { nextAttemptAt: null }],
          },
          {
            $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }],
          },
        ],
      },
      {
        $set: {
          status: 'processing',
          lockedUntil: new Date(Date.now() + NOTIFICATION_LEASE_MS),
        },
        $inc: { attempts: 1 },
      },
      { sort: { createdAt: 1 }, returnDocument: 'after' },
    );

    if (!delivery) break;
    processed += 1;

    try {
      if (delivery.channel === 'sms') {
        const result = await smsProvider.send({
          to: delivery.recipient,
          body: delivery.body,
        });
        if (result.success) {
          delivery.status = 'sent';
          delivery.sentAt = new Date();
          delivery.lastError = undefined;
          delivery.lockedUntil = undefined;
          sent += 1;
          await recordAudit({
            action: 'notification.sent',
            actorType: 'system',
            entityType: 'notification',
            entityId: String(delivery._id),
            orderNumber: delivery.orderNumber,
            metadata: { channel: 'sms', event: delivery.event },
          });
        } else if (result.retryable && delivery.attempts < 5) {
          delivery.status = 'retryable';
          delivery.lastError = result.failureMessage;
          delivery.lockedUntil = undefined;
          delivery.nextAttemptAt = new Date(
            Date.now() + delivery.attempts * 60_000,
          );
          failed += 1;
        } else {
          delivery.status = 'permanent_failure';
          delivery.lastError = result.failureMessage;
          delivery.lockedUntil = undefined;
          failed += 1;
          await recordAudit({
            action: 'notification.failed',
            actorType: 'system',
            entityType: 'notification',
            entityId: String(delivery._id),
            orderNumber: delivery.orderNumber,
            metadata: { channel: 'sms', code: result.failureCode },
          });
        }
      } else {
        const result = await emailProvider.send({
          to: delivery.recipient,
          subject: delivery.subject ?? 'Luxora',
          body: delivery.body,
        });
        if (result.success) {
          delivery.status = 'sent';
          delivery.sentAt = new Date();
          delivery.lastError = undefined;
          delivery.lockedUntil = undefined;
          sent += 1;
          await recordAudit({
            action: 'notification.sent',
            actorType: 'system',
            entityType: 'notification',
            entityId: String(delivery._id),
            orderNumber: delivery.orderNumber,
            metadata: { channel: 'email', event: delivery.event },
          });
        } else if (result.retryable && delivery.attempts < 5) {
          delivery.status = 'retryable';
          delivery.lastError = result.failureMessage;
          delivery.lockedUntil = undefined;
          delivery.nextAttemptAt = new Date(
            Date.now() + delivery.attempts * 60_000,
          );
          failed += 1;
        } else {
          delivery.status = 'permanent_failure';
          delivery.lastError = result.failureMessage;
          delivery.lockedUntil = undefined;
          failed += 1;
          await recordAudit({
            action: 'notification.failed',
            actorType: 'system',
            entityType: 'notification',
            entityId: String(delivery._id),
            orderNumber: delivery.orderNumber,
            metadata: { channel: 'email', code: result.failureCode },
          });
        }
      }
    } catch (error) {
      delivery.status =
        delivery.attempts < 5 ? 'retryable' : 'permanent_failure';
      delivery.lastError =
        error instanceof Error ? error.message : 'unknown';
      delivery.lockedUntil = undefined;
      delivery.nextAttemptAt = new Date(Date.now() + delivery.attempts * 60_000);
      failed += 1;
    }
    await delivery.save();
  }

  // Recover leases from crashed workers (processing past lockedUntil).
  await NotificationDelivery.updateMany(
    {
      status: 'processing',
      lockedUntil: { $lte: now },
    },
    {
      $set: {
        status: 'retryable',
        nextAttemptAt: now,
        lockedUntil: null,
      },
    },
  );

  return { processed, sent, failed };
}
