import { User } from '../../models/User';
import {
  NotificationDelivery,
  buildDeliveryKey,
} from '../../models/NotificationDelivery';
import type { CommerceEventType } from '../../config/constants';
import { env } from '../../config/env';
import { recordAudit } from '../audit.service';
import { logger } from '../../utils/logger';
import { getRequestId } from '../../utils/requestContext';
import { createFetchJsonClient } from '../payments/httpClient';
import type { CommerceEventPayload } from './index';
import { channelsForEvent } from './policy';
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
    return new KavenegarSmsProvider({
      apiKey: env.SMS_API_KEY ?? '',
      sender: env.KAVENEGAR_SENDER,
      baseUrl: env.KAVENEGAR_BASE_URL,
      http: createFetchJsonClient(),
    });
  }
  return new MockSmsProvider();
}

function createEmailProvider(): EmailProvider {
  if (env.EMAIL_PROVIDER === 'smtp') {
    return new SmtpEmailProvider({
      from: env.EMAIL_FROM,
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      secure: env.SMTP_SECURE,
    });
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
  const store = env.STORE_DISPLAY_NAME;
  switch (event) {
    case 'PaymentSuccessful':
      return {
        subject: `پرداخت موفق ${store}`,
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
      return {
        subject: 'درخواست بازپرداخت',
        body: `درخواست بازپرداخت سفارش ${order} ثبت شد.`,
      };
    case 'RefundSuccessful':
      return {
        subject: 'بازپرداخت موفق',
        body: `بازپرداخت سفارش ${order} انجام شد.`,
      };
    case 'RefundFailed':
      return {
        subject: 'خطای بازپرداخت',
        body: `بازپرداخت سفارش ${order} ناموفق بود.`,
      };
    default:
      return { subject: `اعلان ${store}`, body: `رویداد ${event}` };
  }
}

function backoffMs(attempt: number): number {
  const base = env.NOTIFICATION_RETRY_BASE_MS;
  const exp = Math.min(attempt, 6);
  return base * 2 ** Math.max(0, exp - 1);
}

/**
 * Enqueue SMS/email deliveries with deterministic keys.
 * Channel selection comes from the centralized notification policy.
 */
export async function enqueueNotificationsForEvent(
  event: CommerceEventType,
  payload: CommerceEventPayload,
): Promise<void> {
  if (!payload.userId && !payload.orderNumber) return;

  const planned = channelsForEvent(event);
  if (planned.length === 0) return;

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
  const requestId = getRequestId();

  const jobs: Array<{ channel: 'sms' | 'email'; recipient: string }> = [];
  if (planned.includes('sms') && phone) {
    jobs.push({ channel: 'sms', recipient: phone });
  }
  if (planned.includes('email') && email) {
    jobs.push({ channel: 'email', recipient: email });
  }

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
        requestId,
      });
    } catch {
      logger.info('notification.duplicate_suppressed', {
        deliveryKey,
        event,
        requestId,
      });
    }
  }
}

export async function processPendingNotifications(
  limit = 50,
): Promise<{ processed: number; sent: number; failed: number }> {
  const now = new Date();
  let sent = 0;
  let failed = 0;
  let processed = 0;
  const maxAttempts = env.NOTIFICATION_MAX_ATTEMPTS;
  const leaseMs = env.NOTIFICATION_LEASE_MS;

  for (let i = 0; i < limit; i += 1) {
    const delivery = await NotificationDelivery.findOneAndUpdate(
      {
        $or: [
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
          // Recover crashed workers: processing lease expired → re-claim atomically.
          {
            status: 'processing',
            lockedUntil: { $lte: now },
          },
        ],
      },
      {
        $set: {
          status: 'processing',
          lockedUntil: new Date(Date.now() + leaseMs),
          lastAttemptAt: new Date(),
        },
        $inc: { attempts: 1 },
      },
      { sort: { createdAt: 1 }, returnDocument: 'after' },
    );

    if (!delivery) break;
    processed += 1;

    try {
      const result =
        delivery.channel === 'sms'
          ? await smsProvider.send({
              to: delivery.recipient,
              body: delivery.body,
            })
          : await emailProvider.send({
              to: delivery.recipient,
              subject: delivery.subject ?? env.STORE_DISPLAY_NAME,
              body: delivery.body,
            });

      if (result.success) {
        delivery.status = 'sent';
        delivery.sentAt = new Date();
        delivery.providerMessageId = result.providerMessageId;
        delivery.lastError = undefined;
        delivery.failureCode = undefined;
        delivery.failureReason = undefined;
        delivery.lockedUntil = undefined;
        sent += 1;
        await recordAudit({
          action: 'notification.sent',
          actorType: 'system',
          entityType: 'notification',
          entityId: String(delivery._id),
          orderNumber: delivery.orderNumber,
          metadata: {
            channel: delivery.channel,
            event: delivery.event,
            providerMessageId: result.providerMessageId,
          },
        });
      } else if (result.retryable && delivery.attempts < maxAttempts) {
        delivery.status = 'retryable';
        delivery.lastError = result.failureMessage;
        delivery.failureCode = result.failureCode;
        delivery.failureReason = result.failureMessage;
        delivery.lockedUntil = undefined;
        delivery.nextAttemptAt = new Date(
          Date.now() + backoffMs(delivery.attempts),
        );
        failed += 1;
      } else {
        delivery.status = 'permanent_failure';
        delivery.lastError = result.failureMessage;
        delivery.failureCode = result.failureCode ?? 'PERMANENT';
        delivery.failureReason = result.failureMessage;
        delivery.lockedUntil = undefined;
        failed += 1;
        await recordAudit({
          action: 'notification.failed',
          actorType: 'system',
          entityType: 'notification',
          entityId: String(delivery._id),
          orderNumber: delivery.orderNumber,
          metadata: {
            channel: delivery.channel,
            code: result.failureCode,
          },
        });
      }
    } catch (error) {
      delivery.status =
        delivery.attempts < maxAttempts ? 'retryable' : 'permanent_failure';
      delivery.lastError =
        error instanceof Error ? error.message : 'unknown';
      delivery.failureCode = 'WORKER_EXCEPTION';
      delivery.failureReason = delivery.lastError;
      delivery.lockedUntil = undefined;
      delivery.nextAttemptAt = new Date(
        Date.now() + backoffMs(delivery.attempts),
      );
      failed += 1;
    }
    await delivery.save();
  }

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

export async function listAdminNotifications(query: {
  status?: string;
  orderNumber?: string;
  page?: number;
  limit?: number;
}) {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 100);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.orderNumber) filter.orderNumber = query.orderNumber;

  const skip = (page - 1) * limit;
  const [total, docs] = await Promise.all([
    NotificationDelivery.countDocuments(filter),
    NotificationDelivery.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  return {
    items: docs.map((d) => ({
      id: String(d._id),
      deliveryKey: d.deliveryKey,
      event: d.event,
      channel: d.channel,
      recipient: d.recipient,
      status: d.status,
      attempts: d.attempts,
      failureCode: d.failureCode,
      failureReason: d.failureReason,
      providerMessageId: d.providerMessageId,
      orderNumber: d.orderNumber,
      nextAttemptAt: d.nextAttemptAt,
      sentAt: d.sentAt,
      createdAt: d.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

/**
 * Safe retry: only requeue permanent_failure / failed / retryable rows.
 * Resets lease and schedules immediate attempt — send still goes through claim.
 */
export async function retryNotificationDelivery(
  deliveryId: string,
  adminId: string,
) {
  const claimed = await NotificationDelivery.findOneAndUpdate(
    {
      _id: deliveryId,
      status: { $in: ['permanent_failure', 'failed', 'retryable'] },
    },
    {
      $set: {
        status: 'pending',
        nextAttemptAt: new Date(),
        lockedUntil: null,
        failureCode: undefined,
        failureReason: undefined,
        lastError: undefined,
      },
    },
    { returnDocument: 'after' },
  );
  if (!claimed) {
    const existing = await NotificationDelivery.findById(deliveryId);
    if (!existing) return null;
    return existing;
  }

  await recordAudit({
    action: 'notification.retried',
    actorType: 'admin',
    actorId: adminId,
    entityType: 'notification',
    entityId: String(claimed._id),
    orderNumber: claimed.orderNumber,
    metadata: { action: 'retry_requested' },
  });

  return claimed;
}
