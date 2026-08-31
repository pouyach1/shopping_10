import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { Order } from '../src/models/Order';
import { Payment } from '../src/models/Payment';
import { Coupon } from '../src/models/Coupon';
import { grantDefaultStoreAdmin } from './helpers/admin';
import { withDefaultTenant, getDefaultStoreId } from './helpers/tenant';
import { signMockWebhook } from '../src/services/payments/mock.provider';
import { env } from '../src/config/env';
import * as paymentService from '../src/services/payment.service';
import { redeemCouponForOrder } from '../src/services/coupon.service';

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
  await grantDefaultStoreAdmin(userId);
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
  overrides: Record<string, unknown> = {},
): Promise<{ productId: string; categoryId: string }> {
  const cat = await request(app)
    .post('/api/v1/admin/categories')
    .set('Authorization', `Bearer ${admin}`)
    .send({
      name: 'زنانه',
      slug: `women-${Math.random().toString(36).slice(2, 7)}`,
    });
  expect(cat.status).toBe(201);
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
      salePrice: 1_500_000,
      currency: 'تومان',
      images: [{ url: '/img.webp', alt: 'بلوز', isPrimary: true }],
      sizes: ['S', 'M', 'L'],
      stock: 5,
      status: 'active',
      ...overrides,
    });
  expect(product.status).toBe(201);
  return {
    productId: product.body.data.product.id as string,
    categoryId: cat.body.data.category.id as string,
  };
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
  qty = 1,
): Promise<{ orderNumber: string; total: number }> {
  await request(app)
    .post('/api/v1/cart/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ productId, quantity: qty, size: 'M', color: 'مشکی' });

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

describe('Phase 5 — Payments', () => {
  it('Scenario A: double Pay click reuses one open payment', async () => {
    const admin = await adminToken();
    const { productId } = await seedProduct(admin, { stock: 3 });
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);

    const first = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'pay-key-aaaa-1111')
      .send({ orderNumber });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'pay-key-aaaa-1111')
      .send({ orderNumber });
    expect(second.status).toBe(201);
    expect(second.body.data.payment.id).toBe(first.body.data.payment.id);

    const third = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'pay-auto-870837416')
      .send({ orderNumber });
    expect(third.status).toBe(201);
    expect(third.body.data.payment.id).toBe(first.body.data.payment.id);

    const count = await Payment.countDocuments({ orderNumber });
    expect(count).toBe(1);
  });

  it('verifies success via callback and marks order paid', async () => {
    const admin = await adminToken();
    const { productId } = await seedProduct(admin, { stock: 2 });
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'pay-auto-550538565')
      .send({ orderNumber });
    expect(pay.status).toBe(201);
    const authority = pay.body.data.payment.authority as string;

    const cb = await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${token}`)
      .send({ authority, status: 'OK' });
    expect(cb.status).toBe(200);
    expect(cb.body.data.payment.status).toBe('paid');
    expect(cb.body.data.orderStatus).toBe('paid');

    const order = await Order.findOne({ orderNumber });
    expect(order?.paymentStatus).toBe('paid');
    expect(order?.status).toBe('paid');
  });

  it('Scenario B: webhook recovers paid state without browser', async () => {
    const admin = await adminToken();
    const { productId } = await seedProduct(admin, { stock: 2 });
    const { token } = await register();
    const { orderNumber, total } = await createPayableOrder(token, productId);

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'pay-auto-971208360')
      .send({ orderNumber });
    const authority = pay.body.data.payment.authority as string;

    const body = {
      eventId: `evt-${Math.random().toString(36).slice(2)}`,
      authority,
      status: 'paid',
      amount: total,
    };
    const raw = JSON.stringify(body);
    const sig = signMockWebhook(env.PAYMENT_WEBHOOK_SECRET, raw);

    const wh = await request(app)
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('x-luxora-webhook-signature', sig)
      .send(raw);
    expect(wh.status).toBe(200);

    const order = await Order.findOne({ orderNumber });
    expect(order?.status).toBe('paid');
    expect(order?.paymentStatus).toBe('paid');
  });

  it('Scenario C: duplicate webhook is harmless', async () => {
    const admin = await adminToken();
    const { productId } = await seedProduct(admin, { stock: 2 });
    const { token } = await register();
    const { orderNumber, total } = await createPayableOrder(token, productId);

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'pay-auto-282332780')
      .send({ orderNumber });
    const authority = pay.body.data.payment.authority as string;
    const body = {
      eventId: 'evt-duplicate-same',
      authority,
      status: 'paid',
      amount: total,
    };
    const raw = JSON.stringify(body);
    const sig = signMockWebhook(env.PAYMENT_WEBHOOK_SECRET, raw);

    const first = await request(app)
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('x-luxora-webhook-signature', sig)
      .send(raw);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('x-luxora-webhook-signature', sig)
      .send(raw);
    expect(second.status).toBe(200);
    expect(second.body.data.duplicate).toBe(true);

    const payments = await Payment.find({ orderNumber, status: 'paid' });
    expect(payments).toHaveLength(1);
  });

  it('Scenario D: late success after cancel auto-refunds', async () => {
    const admin = await adminToken();
    const { productId } = await seedProduct(admin, { stock: 2 });
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'pay-auto-984344310')
      .send({ orderNumber });
    const authority = pay.body.data.payment.authority as string;

    const cancel = await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'منصرف شدم' });
    expect(cancel.status).toBe(200);

    const cb = await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${token}`)
      .send({ authority, status: 'OK' });
    expect(cb.status).toBe(200);
    expect(cb.body.data.orderStatus).toBe('cancelled');

    const payment = await Payment.findOne({ authority });
    expect(payment?.status).toBe('refunded');
    const order = await Order.findOne({ orderNumber });
    expect(order?.status).toBe('cancelled');
    expect(order?.paymentStatus).not.toBe('paid');
  });

  it('rejects failed verification, wrong amount, invalid webhook, forged amount', async () => {
    const admin = await adminToken();
    const { productId } = await seedProduct(admin, { stock: 4 });
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);

    const failPay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'pay-auto-818780048')
      .send({ orderNumber, simulate: 'failure' });
    // may reuse open payment without simulate if open exists — cancel first
    // Create fresh order for failure simulation
    const { productId: p2 } = await seedProduct(admin, { stock: 2 });
    const { token: t2 } = await register();
    const o2 = await createPayableOrder(t2, p2);
    const fail = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${t2}`)
      .set('Idempotency-Key', 'pay-auto-536340666')
      .send({ orderNumber: o2.orderNumber, simulate: 'failure' });
    expect(fail.status).toBe(201);
    const failCb = await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${t2}`)
      .send({
        authority: fail.body.data.payment.authority,
        status: 'OK',
      });
    expect(failCb.status).toBe(409);
    expect(failCb.body.code).toBe('PAYMENT_VERIFICATION_FAILED');

    const { productId: p3 } = await seedProduct(admin, { stock: 2 });
    const { token: t3 } = await register();
    const o3 = await createPayableOrder(t3, p3);
    const wrong = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${t3}`)
      .set('Idempotency-Key', 'pay-auto-37325620')
      .send({ orderNumber: o3.orderNumber, simulate: 'wrong_amount' });
    const wrongCb = await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${t3}`)
      .send({
        authority: wrong.body.data.payment.authority,
        status: 'OK',
      });
    expect(wrongCb.status).toBe(409);
    expect(wrongCb.body.code).toBe('PAYMENT_AMOUNT_MISMATCH');

    const badSig = await request(app)
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('x-luxora-webhook-signature', 'deadbeef')
      .send({
        eventId: 'x',
        authority: 'mock_success_x',
        status: 'paid',
        amount: 1,
      });
    expect(badSig.status).toBe(400);
    expect(badSig.body.code).toBe('WEBHOOK_INVALID');

    // Client cannot forge amount — body amount ignored at create
    const forged = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'pay-auto-509183402')
      .send({ orderNumber, amount: 1 });
    expect(forged.status).toBe(422);
    void failPay;
  });

  it('blocks guest and cross-user payment access; admin lists payments', async () => {
    const admin = await adminToken();
    const { productId } = await seedProduct(admin, { stock: 2 });
    const a = await register();
    const b = await register();
    const { orderNumber } = await createPayableOrder(a.token, productId);

    const guest = await request(app)
      .post('/api/v1/payments')
      .set('Idempotency-Key', 'pay-auto-707459240')
      .send({ orderNumber });
    expect(guest.status).toBe(401);

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${a.token}`)
      .set('Idempotency-Key', 'pay-auto-839189822')
      .send({ orderNumber });
    expect(pay.status).toBe(201);

    const other = await request(app)
      .get(`/api/v1/payments/${pay.body.data.payment.id}`)
      .set('Authorization', `Bearer ${b.token}`);
    expect(other.status).toBe(404);

    const list = await request(app)
      .get('/api/v1/admin/payments')
      .set('Authorization', `Bearer ${admin}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items.length).toBeGreaterThan(0);

    const customerAdmin = await request(app)
      .get('/api/v1/admin/payments')
      .set('Authorization', `Bearer ${a.token}`);
    expect(customerAdmin.status).toBe(403);
  });

  it('cancelled/delivered orders are not payable; invalid payment transition fails', async () => {
    const admin = await adminToken();
    const { productId } = await seedProduct(admin, { stock: 3 });
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);

    await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'pay-auto-146892541')
      .send({ orderNumber });
    expect(pay.status).toBe(409);
    expect(pay.body.code).toBe('ORDER_ALREADY_CANCELLED');

    const { productId: p2 } = await seedProduct(admin, { stock: 1 });
    const { token: t2 } = await register();
    const o2 = await createPayableOrder(t2, p2);
    const created = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${t2}`)
      .set('Idempotency-Key', 'pay-auto-44215568')
      .send({ orderNumber: o2.orderNumber });
    await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${t2}`)
      .send({
        authority: created.body.data.payment.authority,
        status: 'OK',
      });

    await Order.updateOne(
      { orderNumber: o2.orderNumber },
      { status: 'delivered', fulfillmentStatus: 'delivered' },
    );
    const cancelDelivered = await request(app)
      .post(`/api/v1/orders/${o2.orderNumber}/cancel`)
      .set('Authorization', `Bearer ${t2}`)
      .send({});
    expect(cancelDelivered.status).toBe(409);
    expect(cancelDelivered.body.code).toBe('ORDER_NOT_CANCELLABLE');
  });

  it('expires unpaid reservation and restocks inventory', async () => {
    const admin = await adminToken();
    const { productId } = await seedProduct(admin, { stock: 1 });
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);

    await Order.updateOne(
      { orderNumber },
      { inventoryReservedUntil: new Date(Date.now() - 1000) },
    );

    const released = await withDefaultTenant(() =>
      paymentService.releaseExpiredReservations(10),
    );
    expect(released.released).toBeGreaterThanOrEqual(1);

    const order = await Order.findOne({ orderNumber });
    expect(order?.status).toBe('cancelled');
    expect(order?.inventoryDecremented).toBe(false);
    const product = await Product.findById(productId);
    expect(product?.stock).toBe(1);
  });
});

describe('Phase 5 — Coupons', () => {
  it('applies valid coupon and rejects expired/inactive/min/max', async () => {
    const admin = await adminToken();
    const { productId, categoryId } = await seedProduct(admin, {
      price: 1_000_000,
      salePrice: 1_000_000,
      stock: 10,
    });

    const coupon = await request(app)
      .post('/api/v1/admin/coupons')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        code: 'SAVE10',
        type: 'percentage',
        value: 10,
        maxDiscountAmount: 50_000,
        minOrderAmount: 500_000,
        categoryIds: [categoryId],
      });
    expect(coupon.status).toBe(201);

    const { token } = await register();
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1, size: 'M', color: 'مشکی' });

    const preview = await request(app)
      .post('/api/v1/checkout/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingMethodId: 'post-express', couponCode: 'SAVE10' });
    expect(preview.status).toBe(200);
    expect(preview.body.data.summary.couponDiscount).toBe(50_000);
    expect(preview.body.data.summary.total).toBe(1_000_000 - 50_000 + 65_000);

    await Coupon.updateOne({ code: 'SAVE10' }, { isActive: false });
    const inactive = await request(app)
      .post('/api/v1/checkout/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingMethodId: 'post-express', couponCode: 'SAVE10' });
    expect(inactive.status).toBe(422);
    expect(inactive.body.code).toBe('COUPON_INACTIVE');

    await Coupon.updateOne(
      { code: 'SAVE10' },
      { isActive: true, endsAt: new Date(Date.now() - 1000) },
    );
    const expired = await request(app)
      .post('/api/v1/checkout/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingMethodId: 'post-express', couponCode: 'SAVE10' });
    expect(expired.status).toBe(422);
    expect(expired.body.code).toBe('COUPON_EXPIRED');
  });

  it('Scenario F: concurrent last coupon use — only one succeeds', async () => {
    const admin = await adminToken();
    const { productId } = await seedProduct(admin, {
      price: 800_000,
      salePrice: 800_000,
      stock: 10,
    });
    await request(app)
      .post('/api/v1/admin/coupons')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        code: 'ONCEONLY',
        type: 'fixed',
        value: 10_000,
        usageLimit: 1,
      });

    const a = await register();
    const b = await register();

    async function orderWithCoupon(token: string) {
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId, quantity: 1, size: 'M', color: 'مشکی' });
      return request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', `c-${Math.random().toString(36).slice(2)}`)
        .send({
          shippingMethodId: 'post-express',
          paymentMethod: 'online',
          shippingAddress: address,
          couponCode: 'ONCEONLY',
        });
    }

    const [r1, r2] = await Promise.all([
      orderWithCoupon(a.token),
      orderWithCoupon(b.token),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);
    const winner = r1.status === 201 ? r1 : r2;
    expect(winner.body.data.order.couponDiscount).toBe(10_000);
    const coupon = await Coupon.findOne({ code: 'ONCEONLY' });
    expect(coupon?.usageCount).toBe(1);
  });

  it('enforces product restriction and per-user limit', async () => {
    const admin = await adminToken();
    const a = await seedProduct(admin, {
      price: 900_000,
      salePrice: 900_000,
      stock: 5,
    });
    const b = await seedProduct(admin, {
      price: 900_000,
      salePrice: 900_000,
      stock: 5,
    });
    await request(app)
      .post('/api/v1/admin/coupons')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        code: 'ONLYA',
        type: 'fixed',
        value: 5_000,
        productIds: [a.productId],
        perUserLimit: 1,
      });

    const user = await register();
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId: b.productId, quantity: 1, size: 'M', color: 'مشکی' });
    const bad = await request(app)
      .post('/api/v1/checkout/preview')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ shippingMethodId: 'post-express', couponCode: 'ONLYA' });
    expect(bad.status).toBe(422);
    expect(bad.body.code).toBe('COUPON_NOT_APPLICABLE');

    // Direct redeem race for per-user is covered via usage counter unit path
    const coupon = await Coupon.findOne({ code: 'ONLYA' });
    const storeId = await getDefaultStoreId();
    const orderDoc = await Order.create({
      storeId,
      orderNumber: `LUX-2099-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`,
      user: user.userId,
      status: 'awaiting_payment',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'unfulfilled',
      items: [
        {
          productId: a.productId,
          sku: 'X',
          name: 'n',
          slug: 's',
          imageSrc: '',
          productKind: 'top',
          size: 'M',
          color: 'c',
          quantity: 1,
          unitPrice: 900_000,
          unitFinalPrice: 900_000,
          lineSubtotal: 900_000,
          lineDiscount: 0,
          lineTotal: 900_000,
          currency: 'تومان',
        },
      ],
      shippingAddress: address,
      shippingMethodId: 'post-express',
      shippingMethodTitle: 'پست پیشتاز',
      paymentMethod: 'online',
      currency: 'تومان',
      itemCount: 1,
      subtotal: 900_000,
      discountTotal: 0,
      couponDiscount: 0,
      shippingCost: 65_000,
      total: 965_000,
      refundedTotal: 0,
      history: [],
      inventoryDecremented: false,
      idempotencyKey: `test-a-${Math.random().toString(36).slice(2)}`,
    } as never);
    await withDefaultTenant(() =>
      redeemCouponForOrder({
        code: 'ONLYA',
        userId: user.userId,
        orderId: String(orderDoc._id),
        orderNumber: orderDoc.orderNumber,
        merchandiseSubtotal: 900_000,
        productIds: [a.productId],
        categoryIds: [a.categoryId],
      }),
    );

    const order2 = await Order.create({
      storeId,
      orderNumber: `LUX-2099-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`,
      user: user.userId,
      status: 'awaiting_payment',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'unfulfilled',
      items: orderDoc.items,
      shippingAddress: address,
      shippingMethodId: 'post-express',
      shippingMethodTitle: 'پست پیشتاز',
      paymentMethod: 'online',
      currency: 'تومان',
      itemCount: 1,
      subtotal: 900_000,
      discountTotal: 0,
      couponDiscount: 0,
      shippingCost: 65_000,
      total: 965_000,
      refundedTotal: 0,
      history: [],
      inventoryDecremented: false,
      idempotencyKey: `test-b-${Math.random().toString(36).slice(2)}`,
    } as never);
    await expect(
      withDefaultTenant(() =>
        redeemCouponForOrder({
          code: 'ONLYA',
          userId: user.userId,
          orderId: String(order2._id),
          orderNumber: order2.orderNumber,
          merchandiseSubtotal: 900_000,
          productIds: [a.productId],
          categoryIds: [a.categoryId],
        }),
      ),
    ).rejects.toMatchObject({ code: 'COUPON_USAGE_LIMIT' });
    void coupon;
  });
});

describe('Phase 5 — Refunds', () => {
  it('full and partial refunds; rejects over-refund; idempotent; failed refund', async () => {
    const admin = await adminToken();
    const { productId } = await seedProduct(admin, {
      price: 1_000_000,
      salePrice: 1_000_000,
      stock: 5,
    });
    const { token } = await register();
    const { orderNumber } = await createPayableOrder(token, productId);
    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'pay-auto-123475530')
      .send({ orderNumber });
    await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${token}`)
      .send({
        authority: pay.body.data.payment.authority,
        status: 'OK',
      });

    const partial = await request(app)
      .post(`/api/v1/admin/orders/${orderNumber}/refund`)
      .set('Authorization', `Bearer ${admin}`)
      .send({
        amount: 100_000,
        idempotencyKey: 'refund-partial-1',
        reason: 'partial',
      });
    expect(partial.status).toBe(201);
    expect(partial.body.data.refund.status).toBe('succeeded');

    const dup = await request(app)
      .post(`/api/v1/admin/orders/${orderNumber}/refund`)
      .set('Authorization', `Bearer ${admin}`)
      .send({
        amount: 100_000,
        idempotencyKey: 'refund-partial-1',
      });
    expect(dup.status).toBe(201);
    expect(dup.body.data.refund.id).toBe(partial.body.data.refund.id);

    const over = await request(app)
      .post(`/api/v1/admin/orders/${orderNumber}/refund`)
      .set('Authorization', `Bearer ${admin}`)
      .send({
        amount: 9_999_999,
        idempotencyKey: 'refund-over',
      });
    expect(over.status).toBe(409);
    expect(over.body.code).toBe('REFUND_EXCEEDS_PAID_AMOUNT');

    const rest = await request(app)
      .post(`/api/v1/admin/orders/${orderNumber}/refund`)
      .set('Authorization', `Bearer ${admin}`)
      .send({
        idempotencyKey: 'refund-rest',
      });
    expect(rest.status).toBe(201);

    const { productId: p2 } = await seedProduct(admin, {
      price: 500_000,
      salePrice: 500_000,
      stock: 2,
    });
    const u2 = await register();
    const o2 = await createPayableOrder(u2.token, p2);
    const pay2 = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${u2.token}`)
      .set('Idempotency-Key', 'pay-auto-639263313')
      .send({ orderNumber: o2.orderNumber });
    await request(app)
      .post('/api/v1/payments/callback')
      .set('Authorization', `Bearer ${u2.token}`)
      .send({
        authority: pay2.body.data.payment.authority,
        status: 'OK',
      });
    const failed = await request(app)
      .post(`/api/v1/admin/orders/${o2.orderNumber}/refund`)
      .set('Authorization', `Bearer ${admin}`)
      .send({
        idempotencyKey: 'refund-fail-1',
        simulate: 'refund_failure',
      });
    expect(failed.status).toBe(409);
    expect(failed.body.code).toBe('REFUND_FAILED');
  });
});

describe('Phase 5 — Inventory races', () => {
  it('Scenario E: two customers buying last unit — exactly one succeeds', async () => {
    const admin = await adminToken();
    const { productId } = await seedProduct(admin, {
      price: 700_000,
      salePrice: 700_000,
      stock: 1,
    });
    const a = await register();
    const b = await register();

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ productId, quantity: 1, size: 'M', color: 'مشکی' });
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${b.token}`)
      .send({ productId, quantity: 1, size: 'M', color: 'مشکی' });

    const [r1, r2] = await Promise.all([
      request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${a.token}`)
        .set('Idempotency-Key', `last-a-${Date.now()}`)
        .send({
          shippingMethodId: 'post-express',
          paymentMethod: 'online',
          shippingAddress: address,
        }),
      request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${b.token}`)
        .set('Idempotency-Key', `last-b-${Date.now()}`)
        .send({
          shippingMethodId: 'post-express',
          paymentMethod: 'online',
          shippingAddress: address,
        }),
    ]);

    const ok = [r1, r2].filter((r) => r.status === 201);
    const fail = [r1, r2].filter((r) => r.status === 409);
    expect(ok).toHaveLength(1);
    expect(fail).toHaveLength(1);
    expect(fail[0].body.code).toBe('INSUFFICIENT_STOCK');
    const product = await Product.findById(productId);
    expect(product?.stock).toBe(0);
  });
});
