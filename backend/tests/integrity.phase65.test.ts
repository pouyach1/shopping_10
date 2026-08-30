import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { Order } from '../src/models/Order';
import { Payment } from '../src/models/Payment';
import { Refund } from '../src/models/Refund';
import { InventoryHold } from '../src/models/InventoryHold';
import { signMockWebhook } from '../src/services/payments/mock.provider';
import { env } from '../src/config/env';
import * as paymentService from '../src/services/payment.service';
import { recoverOrphanedInventoryHolds } from '../src/services/inventoryHold.service';
import { claimAndRestoreOrderInventory } from '../src/services/inventoryRelease.service';
import { getPaymentProvider, setPaymentProvider } from '../src/services/payments';
import { ZarinpalPaymentProvider } from '../src/services/payments/zarinpal.provider';

const app = createApp();

async function register(): Promise<{ token: string; userId: string }> {
  const phone = `0912${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
  const email = `user-${Math.random().toString(36).slice(2)}@luxora.ir`;
  const res = await request(app).post('/api/v1/auth/register').send({
    firstName: 'سارا',
    lastName: 'محمدی',
    phone,
    email,
    password: 'demo1234a',
  });
  expect(res.status).toBe(201);
  return {
    token: res.body.data.accessToken as string,
    userId: res.body.data.user.id as string,
  };
}

async function adminToken(): Promise<string> {
  const { userId } = await register();
  await User.findByIdAndUpdate(userId, { role: 'admin' });
  const user = await User.findById(userId);
  const login = await request(app).post('/api/v1/auth/login').send({
    identifier: user!.email,
    password: 'demo1234a',
  });
  expect(login.status).toBe(200);
  return login.body.data.accessToken as string;
}

async function seedProduct(
  admin: string,
  stock = 5,
): Promise<string> {
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
      name: 'بلوز حریر',
      slug: `silk-${Math.random().toString(36).slice(2, 8)}`,
      sku: `LX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      categoryId: cat.body.data.category.id,
      productKind: 'top',
      price: 2_000_000,
      salePrice: 1_000_000,
      currency: 'تومان',
      images: [{ url: '/img.webp', alt: 'بلوز', isPrimary: true }],
      sizes: ['M'],
      stock,
      status: 'active',
    });
  expect(product.status).toBe(201);
  return product.body.data.product.id as string;
}

const address = {
  recipientName: 'سارا محمدی',
  phone: '09121234567',
  province: 'تهران',
  city: 'تهران',
  addressLine: 'خیابان ولیعصر، پلاک ۱۲',
  postalCode: '1234567890',
};

async function createPayableOrder(
  token: string,
  productId: string,
): Promise<{ orderNumber: string; total: number }> {
  await request(app)
    .post('/api/v1/cart/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ productId, quantity: 1, size: 'M', color: 'مشکی' });

  const created = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', `ord-${Math.random().toString(36).slice(2)}`)
    .send({
      shippingMethodId: 'post-express',
      paymentMethod: 'online',
      shippingAddress: address,
    });
  expect(created.status).toBe(201);
  return {
    orderNumber: created.body.data.order.orderNumber as string,
    total: created.body.data.order.total as number,
  };
}

describe('Phase 6.5 — Commerce integrity', () => {
  it('P0-01: payment success vs cancel — exactly one winner, never paid+restored', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 3);
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `pay-${Math.random().toString(36).slice(2)}`)
      .send({ orderNumber });
    expect(pay.status).toBe(201);
    const authority = pay.body.data.payment.authority as string;

    const results = await Promise.all([
      request(app)
        .post('/api/v1/payments/callback')
        .set('Authorization', `Bearer ${token}`)
        .send({ authority, status: 'OK' }),
      request(app)
        .post(`/api/v1/orders/${orderNumber}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'race' }),
    ]);

    const order = await Order.findOne({ orderNumber });
    const payment = await Payment.findOne({ authority });
    const product = await Product.findById(productId);

    expect(order).toBeTruthy();
    // Never paid + cancelled
    expect(!(order!.status === 'paid' && order!.status === 'cancelled')).toBe(
      true,
    );
    if (order!.status === 'paid') {
      expect(payment!.status).toBe('paid');
      expect(order!.inventoryDecremented).toBe(true);
      expect(product!.stock).toBe(2);
      expect(results.some((r) => r.status === 200)).toBe(true);
    } else {
      expect(order!.status).toBe('cancelled');
      expect(order!.inventoryDecremented).toBe(false);
      expect(product!.stock).toBe(3);
      // Payment may be refunded (mock) or needs_manual — never leave paid without flag if cancelled
      if (payment!.status === 'paid') {
        expect(payment!.needsManualRefund).toBe(true);
        expect(order!.financialIntegrityStatus).toBe(
          'paid_needs_manual_refund',
        );
      }
    }
  });

  it('P0-01×20: concurrent callback+cancel races stay consistent', async () => {
    const admin = await adminToken();
    for (let i = 0; i < 20; i += 1) {
      const productId = await seedProduct(admin, 1);
      const { token } = await register();
      const { orderNumber } = await createPayableOrder(token, productId);
      const pay = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', `pay-r-${i}-${Math.random().toString(36).slice(2)}`)
        .send({ orderNumber });
      const authority = pay.body.data.payment.authority as string;

      await Promise.all([
        request(app)
          .post('/api/v1/payments/callback')
          .set('Authorization', `Bearer ${token}`)
          .send({ authority, status: 'OK' }),
        request(app)
          .post(`/api/v1/orders/${orderNumber}/cancel`)
          .set('Authorization', `Bearer ${token}`)
          .send({}),
      ]);

      const order = await Order.findOne({ orderNumber });
      const product = await Product.findById(productId);
      expect(['paid', 'cancelled']).toContain(order!.status);
      if (order!.status === 'paid') {
        expect(order!.inventoryDecremented).toBe(true);
        expect(product!.stock).toBe(0);
      } else {
        expect(order!.inventoryDecremented).toBe(false);
        expect(product!.stock).toBe(1);
      }
      // Impossible: paid order with restored stock claim
      if (order!.status === 'paid') {
        expect(order!.inventoryReleaseClaimedAt == null).toBe(true);
      }
    }
  }, 120_000);

  it('P0-02: orphaned inventory hold recovers stock after crash window', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 2);
    const { userId } = await register();

    const hold = await InventoryHold.create({
      user: userId,
      status: 'decremented',
      items: [{ productId, quantity: 1 }],
      recoverAfter: new Date(Date.now() - 1000),
    });
    await Product.findByIdAndUpdate(productId, { $inc: { stock: -1 } });

    const before = await Product.findById(productId);
    expect(before!.stock).toBe(1);

    const result = await recoverOrphanedInventoryHolds(10);
    expect(result.recovered).toBeGreaterThanOrEqual(1);

    const after = await Product.findById(productId);
    expect(after!.stock).toBe(2);
    const holdFresh = await InventoryHold.findById(hold._id);
    expect(holdFresh!.status).toBe('released');
  });

  it('P0-03: Zarinpal unsupported refund → needs_manual_refund, never auto_refunded', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 2);
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `pay-z-${Math.random().toString(36).slice(2)}`)
      .send({ orderNumber });
    const authority = pay.body.data.payment.authority as string;
    const paymentId = pay.body.data.payment.id as string;

    await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    // Swap provider to Zarinpal stub for refund path only via payment doc provider field —
    // call applySuccessfulPaymentForReconcile after forcing provider.
    const previous = getPaymentProvider();
    setPaymentProvider(
      new ZarinpalPaymentProvider({
        merchantId: '00000000-0000-0000-0000-000000000000',
        sandbox: true,
        http: {
          postJson: async () => ({
            status: 200,
            data: { data: { code: 100, ref_id: 1 }, errors: [] },
          }),
        },
      }),
    );

    try {
      const payment = await Payment.findById(paymentId);
      const result = await paymentService.applySuccessfulPaymentForReconcile(
        payment!,
        'forced-tx',
      );
      expect(result.outcome).toBe('needs_manual_refund');

      const freshPay = await Payment.findById(paymentId);
      const order = await Order.findOne({ orderNumber });
      expect(freshPay!.status).toBe('paid');
      expect(freshPay!.needsManualRefund).toBe(true);
      expect(order!.status).toBe('cancelled');
      expect(order!.financialIntegrityStatus).toBe('paid_needs_manual_refund');
      expect(order!.paymentStatus).not.toBe('paid');
    } finally {
      setPaymentProvider(previous);
    }
    void authority;
  });

  it('P0-04: concurrent refunds never exceed captured amount', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 2);
    const { token } = await register();
    const { orderNumber, total } = await createPayableOrder(token, productId);

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `pay-rf-${Math.random().toString(36).slice(2)}`)
      .send({ orderNumber });
    await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${token}`)
      .send({
        authority: pay.body.data.payment.authority,
        status: 'OK',
      });

    const half = Math.floor(total / 2);
    const attempts = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .post(`/api/v1/admin/orders/${orderNumber}/refund`)
        .set('Authorization', `Bearer ${admin}`)
        .send({
          amount: half || 1,
          idempotencyKey: `rf-concurrent-${i}-${Math.random().toString(36).slice(2)}`,
        }),
    );
    const results = await Promise.all(attempts);
    const succeeded = results.filter((r) => r.status === 201);
    const payment = await Payment.findOne({ orderNumber, status: { $in: ['refunded', 'partially_refunded', 'paid'] } });
    const refunds = await Refund.find({
      orderNumber,
      status: 'succeeded',
    });
    const sum = refunds.reduce((s, r) => s + r.amount, 0);
    expect(sum).toBeLessThanOrEqual(total);
    expect(payment!.refundedAmount).toBeLessThanOrEqual(payment!.amount);
    expect(succeeded.length).toBeGreaterThanOrEqual(1);
    expect(sum).toBe(payment!.refundedAmount);
  });

  it('P1: customer cannot cancel a paid order', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 1);
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);
    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `pay-pc-${Math.random().toString(36).slice(2)}`)
      .send({ orderNumber });
    await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${token}`)
      .send({
        authority: pay.body.data.payment.authority,
        status: 'OK',
      });

    const cancel = await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(cancel.status).toBe(409);
    expect(cancel.body.code).toBe('ORDER_NOT_CANCELLABLE');
  });

  it('P1: cancel × expiry restore inventory exactly once', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 1);
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);

    await Order.updateOne(
      { orderNumber },
      { inventoryReservedUntil: new Date(Date.now() - 1000) },
    );

    const order = await Order.findOne({ orderNumber });
    await Promise.all([
      request(app)
        .post(`/api/v1/orders/${orderNumber}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({}),
      paymentService.releaseExpiredReservations(10),
      claimAndRestoreOrderInventory(order!._id, 'customer_cancel'),
      claimAndRestoreOrderInventory(order!._id, 'payment_expired'),
    ]);

    // Run expiry many times
    await Promise.all(
      Array.from({ length: 20 }, () =>
        paymentService.releaseExpiredReservations(10),
      ),
    );

    const product = await Product.findById(productId);
    const fresh = await Order.findOne({ orderNumber });
    expect(product!.stock).toBe(1);
    expect(fresh!.inventoryDecremented).toBe(false);
    expect(fresh!.inventoryReleaseClaimedAt).toBeTruthy();
  });

  it('P1: idempotency same key + different body conflicts', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 3);
    const { token } = await register();
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1, size: 'M', color: 'مشکی' });

    const key = `idem-${Math.random().toString(36).slice(2)}`;
    const first = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({
        shippingMethodId: 'post-express',
        paymentMethod: 'online',
        shippingAddress: address,
      });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({
        shippingMethodId: 'tipax',
        paymentMethod: 'online',
        shippingAddress: address,
      });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('P1: Idempotency-Key required for payments', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 1);
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderNumber });
    expect(res.status).toBe(400);
  });

  it('P1: forged failure webhook cannot mark paid payment failed when provider still paid', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 1);
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);
    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `pay-wh-${Math.random().toString(36).slice(2)}`)
      .send({ orderNumber });
    const authority = pay.body.data.payment.authority as string;

    // First succeed via callback
    await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${token}`)
      .send({ authority, status: 'OK' });

    const raw = JSON.stringify({
      eventId: `fail-${Math.random().toString(36).slice(2)}`,
      authority,
      status: 'failed',
      amount: pay.body.data.payment.amount,
    });
    const sig = signMockWebhook(env.PAYMENT_WEBHOOK_SECRET, raw);
    const wh = await request(app)
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('x-luxora-webhook-signature', sig)
      .send(raw);
    expect(wh.status).toBe(200);

    const payment = await Payment.findOne({ authority });
    expect(payment!.status).toBe('paid');
  });

  it('P2: request id returned; admin timeline joins commerce state', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 1);
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `pay-tl-${Math.random().toString(36).slice(2)}`)
      .set('X-Request-Id', 'test-req-timeline-01')
      .send({ orderNumber });
    expect(pay.headers['x-request-id']).toBe('test-req-timeline-01');

    await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${token}`)
      .send({
        authority: pay.body.data.payment.authority,
        status: 'OK',
      });

    const timeline = await request(app)
      .get(`/api/v1/admin/orders/${orderNumber}/timeline`)
      .set('Authorization', `Bearer ${admin}`);
    expect(timeline.status).toBe(200);
    expect(timeline.body.data.timeline.order.orderNumber).toBe(orderNumber);
    expect(timeline.body.data.timeline.payments.length).toBeGreaterThan(0);
    expect(timeline.body.data.timeline.audits.length).toBeGreaterThan(0);
  });

  it('money invariant: integer totals; refund cannot exceed capture', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, 1);
    const { token } = await register();
    const { orderNumber, total } = await createPayableOrder(token, productId);
    expect(Number.isInteger(total)).toBe(true);

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `pay-m-${Math.random().toString(36).slice(2)}`)
      .send({ orderNumber });
    await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${token}`)
      .send({
        authority: pay.body.data.payment.authority,
        status: 'OK',
      });

    const over = await request(app)
      .post(`/api/v1/admin/orders/${orderNumber}/refund`)
      .set('Authorization', `Bearer ${admin}`)
      .send({
        amount: total + 1,
        idempotencyKey: `over-${Math.random().toString(36).slice(2)}`,
      });
    expect(over.status).toBe(409);
    expect(over.body.code).toBe('REFUND_EXCEEDS_PAID_AMOUNT');
  });
});
