import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../src/app';
import request from 'supertest';
import { User } from '../src/models/User';
import { Order } from '../src/models/Order';
import { Payment } from '../src/models/Payment';
import { NotificationDelivery } from '../src/models/NotificationDelivery';
import { signMockWebhook } from '../src/services/payments/mock.provider';
import { env } from '../src/config/env';
import {
  createPaymentProvider,
  resetPaymentProviderCache,
  tomanToRial,
  rialToToman,
} from '../src/services/payments';
import { ZarinpalPaymentProvider } from '../src/services/payments/zarinpal.provider';
import type { HttpJsonClient } from '../src/services/payments/httpClient';
import {
  setSmsProvider,
  setEmailProvider,
  processPendingNotifications,
  resetNotificationProviders,
} from '../src/services/notifications';
import { MockSmsProvider } from '../src/services/notifications/sms';
import { MockEmailProvider } from '../src/services/notifications/email';
import * as paymentService from '../src/services/payment.service';
import { reconcilePayment } from '../src/services/reconciliation.service';
import { runReservationTick } from '../src/services/scheduler';

const app = createApp();

async function register(
  overrides: Record<string, string> = {},
): Promise<{ token: string; userId: string }> {
  const phone =
    overrides.phone ??
    `0912${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
  const email =
    overrides.email ??
    `user-${Math.random().toString(36).slice(2)}@luxora.ir`;
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      firstName: 'سارا',
      lastName: 'محمدی',
      phone,
      email,
      password: 'demo1234a',
      ...overrides,
    });
  expect(res.status).toBe(201);
  return {
    token: res.body.data.accessToken as string,
    userId: res.body.data.user.id as string,
  };
}

async function adminToken(): Promise<string> {
  const { userId } = await register({
    phone: `0912${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`,
    email: `admin-${Math.random().toString(36).slice(2)}@luxora.ir`,
  });
  await User.findByIdAndUpdate(userId, { role: 'admin' });
  const user = await User.findById(userId);
  const login = await request(app).post('/api/v1/auth/login').send({
    identifier: user!.email,
    password: 'demo1234a',
  });
  return login.body.data.accessToken as string;
}

async function seedProduct(admin: string, stock = 3): Promise<string> {
  const cat = await request(app)
    .post('/api/v1/admin/categories')
    .set('Authorization', `Bearer ${admin}`)
    .send({
      name: 'زنانه',
      slug: `women-${Math.random().toString(36).slice(2, 7)}`,
    });
  const product = await request(app)
    .post('/api/v1/admin/products')
    .set('Authorization', `Bearer ${admin}`)
    .send({
      name: 'بلوز',
      slug: `silk-${Math.random().toString(36).slice(2, 8)}`,
      sku: `LX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      categoryId: cat.body.data.category.id,
      productKind: 'top',
      price: 1_000_000,
      salePrice: 900_000,
      currency: 'تومان',
      images: [{ url: '/img.webp', alt: 'x', isPrimary: true }],
      sizes: ['M'],
      stock,
      status: 'active',
    });
  return product.body.data.product.id as string;
}

const address = {
  recipientName: 'سارا محمدی',
  phone: '09121234567',
  province: 'تهران',
  city: 'تهران',
  addressLine: 'خیابان ولیعصر، پلاک ۱۲',
};

async function createOrderAndPayment(token: string, productId: string) {
  await request(app)
    .post('/api/v1/cart/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ productId, quantity: 1, size: 'M', color: 'مشکی' });
  const order = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', `o-${Math.random().toString(36).slice(2)}`)
    .send({
      shippingMethodId: 'post-express',
      paymentMethod: 'online',
      shippingAddress: address,
    });
  expect(order.status).toBe(201);
  const pay = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${token}`)
    .send({ orderNumber: order.body.data.order.orderNumber });
  expect(pay.status).toBe(201);
  return {
    orderNumber: order.body.data.order.orderNumber as string,
    total: order.body.data.order.total as number,
    payment: pay.body.data.payment,
  };
}

describe('Phase 6 — money conversion', () => {
  it('converts تومان ↔ ریال without floats', () => {
    expect(tomanToRial(1000)).toBe(10_000);
    expect(rialToToman(10_000)).toBe(1000);
    expect(() => tomanToRial(10.5)).toThrow();
    expect(() => rialToToman(1001)).toThrow();
  });
});

describe('Phase 6 — Zarinpal provider (mocked HTTP)', () => {
  it('creates payment with rial amount and builds StartPay URL', async () => {
    const calls: unknown[] = [];
    const http: HttpJsonClient = {
      async postJson(_url, body) {
        calls.push(body);
        return {
          status: 200,
          data: {
            data: {
              code: 100,
              authority: 'A00000000000000000000000000000000001',
              fee: 0,
            },
            errors: [],
          },
        };
      },
    };
    const provider = new ZarinpalPaymentProvider({
      merchantId: '1344b5d4-0048-11e8-94db-005056a205be',
      sandbox: true,
      http,
    });
    const result = await provider.createPayment({
      paymentId: 'pid',
      orderNumber: 'LUX-2026-000001',
      amount: 150_000,
      currency: 'تومان',
      description: 'test',
      callbackUrl: 'http://localhost:5173/payment/callback',
    });
    expect((calls[0] as { amount: number }).amount).toBe(1_500_000);
    expect(result.authority).toMatch(/^A0/);
    expect(result.redirectUrl).toContain(
      'https://sandbox.zarinpal.com/pg/StartPay/',
    );
  });

  it('treats verify code 101 as idempotent success', async () => {
    const http: HttpJsonClient = {
      async postJson() {
        return {
          status: 200,
          data: {
            data: { code: 101, message: 'Verified', ref_id: 99 },
            errors: [],
          },
        };
      },
    };
    const provider = new ZarinpalPaymentProvider({
      merchantId: '1344b5d4-0048-11e8-94db-005056a205be',
      sandbox: true,
      http,
    });
    const verified = await provider.verifyPayment({
      authority: 'A00000000000000000000000000000000001',
      amount: 10_000,
      currency: 'تومان',
    });
    expect(verified.success).toBe(true);
    expect(verified.providerTransactionId).toBe('99');
  });

  it('maps provider errors and timeouts', async () => {
    const errHttp: HttpJsonClient = {
      async postJson() {
        return {
          status: 200,
          data: { data: {}, errors: { code: -9, message: ' mercant' } },
        };
      },
    };
    const provider = new ZarinpalPaymentProvider({
      merchantId: '1344b5d4-0048-11e8-94db-005056a205be',
      sandbox: false,
      http: errHttp,
    });
    await expect(
      provider.createPayment({
        paymentId: 'x',
        orderNumber: 'LUX-2026-000002',
        amount: 1000,
        currency: 'تومان',
        description: 'x',
        callbackUrl: 'http://localhost/cb',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_ERROR' });

    const timeoutHttp: HttpJsonClient = {
      async postJson() {
        const err = new Error('aborted');
        err.name = 'AbortError';
        throw err;
      },
    };
    const timed = new ZarinpalPaymentProvider({
      merchantId: '1344b5d4-0048-11e8-94db-005056a205be',
      sandbox: true,
      http: timeoutHttp,
    });
    const verify = await timed.verifyPayment({
      authority: 'A1',
      amount: 1000,
      currency: 'تومان',
    });
    expect(verify.success).toBe(false);
    expect(verify.failureCode).toBe('PROVIDER_TIMEOUT');
  });
});

describe('Phase 6 — callback/webhook races & notifications', () => {
  beforeEach(() => {
    resetPaymentProviderCache();
    resetNotificationProviders();
  });

  it('Case A/B/C/D/E: callback+webhook races converge to one paid state and one SMS', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 4);
    const user = await register();
    const { orderNumber, total, payment } = await createOrderAndPayment(
      user.token,
      productId,
    );
    const authority = payment.authority as string;

    const body = {
      eventId: `race-${Math.random().toString(36).slice(2)}`,
      authority,
      status: 'paid',
      amount: total,
    };
    const raw = JSON.stringify(body);
    const sig = signMockWebhook(env.PAYMENT_WEBHOOK_SECRET, raw);

    const [cb, wh] = await Promise.all([
      request(app)
        .post('/api/v1/payments/callback')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ authority, status: 'OK' }),
      request(app)
        .post('/api/v1/payments/webhooks/mock')
        .set('Content-Type', 'application/json')
        .set('x-luxora-webhook-signature', sig)
        .send(raw),
    ]);

    expect([cb.status, wh.status].every((s) => s === 200)).toBe(true);

    const paid = await Payment.find({ orderNumber, status: 'paid' });
    expect(paid).toHaveLength(1);
    const order = await Order.findOne({ orderNumber });
    expect(order?.status).toBe('paid');

    // Duplicate callback + webhook
    const cb2 = await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ authority, status: 'OK' });
    expect(cb2.status).toBe(200);

    const wh2 = await request(app)
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('x-luxora-webhook-signature', sig)
      .send(raw);
    expect(wh2.body.data.duplicate).toBe(true);

    await processPendingNotifications(50);
    const sms = await NotificationDelivery.find({
      event: 'PaymentSuccessful',
      channel: 'sms',
      orderNumber,
      status: 'sent',
    });
    expect(sms.length).toBeLessThanOrEqual(1);
    expect(sms.length).toBe(1);
  });

  it('SMS failure does not rollback successful payment', async () => {
    const sms = new MockSmsProvider();
    sms.failNext = true;
    sms.permanentFailNext = true;
    setSmsProvider(sms);
    setEmailProvider(new MockEmailProvider());

    const admin = await adminToken();
    const productId = await seedProduct(admin, 2);
    const user = await register();
    const { payment } = await createOrderAndPayment(user.token, productId);

    const cb = await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ authority: payment.authority, status: 'OK' });
    expect(cb.status).toBe(200);
    expect(cb.body.data.payment.status).toBe('paid');

    await processPendingNotifications(20);
    const order = await Order.findOne({ orderNumber: payment.orderNumber });
    expect(order?.status).toBe('paid');
  });
});

describe('Phase 6 — reservation scheduler & reconciliation', () => {
  it('duplicate scheduler ticks release inventory once', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 1);
    const user = await register();
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, quantity: 1, size: 'M', color: 'مشکی' });
    const order = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${user.token}`)
      .set('Idempotency-Key', `exp-${Math.random().toString(36).slice(2)}`)
      .send({
        shippingMethodId: 'post-express',
        paymentMethod: 'online',
        shippingAddress: address,
      });
    const orderNumber = order.body.data.order.orderNumber as string;
    await Order.updateOne(
      { orderNumber },
      { inventoryReservedUntil: new Date(Date.now() - 1000) },
    );

    await Promise.all([runReservationTick(), runReservationTick()]);
    await runReservationTick();

    const doc = await Order.findOne({ orderNumber });
    expect(doc?.status).toBe('cancelled');
    expect(doc?.inventoryDecremented).toBe(false);
    const { Product } = await import('../src/models/Product');
    const product = await Product.findById(productId);
    expect(product?.stock).toBe(1);
  });

  it('reconcile detects provider paid / local pending and can apply safe fix', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 2);
    const user = await register();
    const { payment } = await createOrderAndPayment(user.token, productId);

    // Simulate drift: leave payment redirected while provider would succeed on verify
    await Payment.updateOne(
      { _id: payment.id },
      { status: 'redirected', authority: payment.authority },
    );

    const report = await reconcilePayment(payment.id, { applySafeFix: true });
    expect(report.findings).toContain('provider_paid_local_pending');
    expect(report.appliedFix).toBe(true);

    const fresh = await Payment.findById(payment.id);
    expect(fresh?.status).toBe('paid');
  });

  it('admin reconcile endpoint requires admin', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 1);
    const user = await register();
    const { payment } = await createOrderAndPayment(user.token, productId);

    const denied = await request(app)
      .post(`/api/v1/admin/payments/${payment.id}/reconcile`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({});
    expect(denied.status).toBe(403);

    const ok = await request(app)
      .post(`/api/v1/admin/payments/${payment.id}/reconcile`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ applySafeFix: false });
    expect(ok.status).toBe(200);
    expect(ok.body.data.report.paymentId).toBe(payment.id);
  });
});

describe('Phase 6 — factory still defaults to mock in tests', () => {
  it('createPaymentProvider(mock) works', () => {
    const provider = createPaymentProvider('mock');
    expect(provider.id).toBe('mock');
  });
});
