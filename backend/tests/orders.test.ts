import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { Order } from '../src/models/Order';

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
    phone: '09121112222',
    email: 'admin-orders@luxora.ir',
  });
  await User.findByIdAndUpdate(userId, { role: 'admin' });
  const login = await request(app).post('/api/v1/auth/login').send({
    identifier: 'admin-orders@luxora.ir',
    password: 'demo1234a',
  });
  expect(login.status).toBe(200);
  return login.body.data.accessToken as string;
}

async function seedProduct(
  admin: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
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

describe('Checkout + Orders', () => {
  it('rejects guest checkout and empty cart', async () => {
    const guest = await request(app)
      .post('/api/v1/checkout/preview')
      .send({ shippingMethodId: 'post-express' });
    expect(guest.status).toBe(401);

    const { token } = await register();
    const empty = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingMethodId: 'post-express',
        paymentMethod: 'online',
        shippingAddress: address,
      });
    expect(empty.status).toBe(409);
    expect(empty.body.code).toBe('CART_EMPTY');
  });

  it('previews and creates order with snapshots, free shipping, clears cart', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, {
      price: 3_000_000,
      salePrice: 2_800_000,
      stock: 4,
    });
    const { token } = await register();

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2, size: 'M', color: 'مشکی' });

    const preview = await request(app)
      .post('/api/v1/checkout/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingMethodId: 'post-express' });
    expect(preview.status).toBe(200);
    expect(preview.body.data.ready).toBe(true);
    expect(preview.body.data.summary.subtotal).toBe(2_800_000 * 2);
    expect(preview.body.data.summary.shippingCost).toBe(0); // free shipping >= 5M
    expect(preview.body.data.summary.total).toBe(5_600_000);

    const created = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'checkout-key-aaaa-1111')
      .send({
        shippingMethodId: 'post-express',
        paymentMethod: 'online',
        shippingAddress: address,
        expectedTotal: 5_600_000,
      });
    expect(created.status).toBe(201);
    const order = created.body.data.order;
    expect(order.orderNumber).toMatch(/^LUX-\d{4}-\d{6}$/);
    expect(order.status).toBe('awaiting_payment');
    expect(order.paymentStatus).toBe('unpaid');
    expect(order.items[0].name).toBe('بلوز حریر');
    expect(order.items[0].unitFinalPrice).toBe(2_800_000);
    expect(order.shippingAddress.city).toBe('تهران');
    expect(order.shippingCost).toBe(0);
    expect(order.history).toHaveLength(1);

    const cart = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(cart.body.data.items).toHaveLength(0);

    const stock = await Product.findById(productId);
    expect(stock!.stock).toBe(2);

    // Idempotent replay
    const replay = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'checkout-key-aaaa-1111')
      .send({
        shippingMethodId: 'post-express',
        paymentMethod: 'online',
        shippingAddress: address,
        expectedTotal: 5_600_000,
      });
    expect(replay.status).toBe(201);
    expect(replay.body.data.order.orderNumber).toBe(order.orderNumber);
    expect(await Order.countDocuments()).toBe(1);
  });

  it('charges paid shipping below threshold and snapshots historical price', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, {
      price: 1_000_000,
      salePrice: null,
      stock: 3,
    });
    const { token } = await register();

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1 });

    const created = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingMethodId: 'tipax',
        paymentMethod: 'cash_on_delivery',
        shippingAddress: address,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.order.shippingCost).toBe(85_000);
    expect(created.body.data.order.total).toBe(1_085_000);
    expect(created.body.data.order.items[0].unitFinalPrice).toBe(1_000_000);

    // Change product price — order snapshot unchanged
    await request(app)
      .patch(`/api/v1/admin/products/${productId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ price: 9_999_000 });

    const fetched = await request(app)
      .get(`/api/v1/orders/${created.body.data.order.orderNumber}`)
      .set('Authorization', `Bearer ${token}`);
    expect(fetched.body.data.order.items[0].unitFinalPrice).toBe(1_000_000);
  });

  it('rejects insufficient stock and concurrent last-unit race leaves one winner', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, {
      price: 500_000,
      salePrice: null,
      stock: 1,
    });
    const a = await register();
    const b = await register();

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ productId, quantity: 1 });
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${b.token}`)
      .send({ productId, quantity: 1 });

    const [ra, rb] = await Promise.all([
      request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${a.token}`)
        .set('Idempotency-Key', 'race-a-key-0001')
        .send({
          shippingMethodId: 'post-regular',
          paymentMethod: 'online',
          shippingAddress: address,
        }),
      request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${b.token}`)
        .set('Idempotency-Key', 'race-b-key-0001')
        .send({
          shippingMethodId: 'post-regular',
          paymentMethod: 'online',
          shippingAddress: address,
        }),
    ]);

    const statuses = [ra.status, rb.status].sort();
    expect(statuses).toEqual([201, 409]);
    expect(await Order.countDocuments()).toBe(1);
    const stock = await Product.findById(productId);
    expect(stock!.stock).toBe(0);
  });

  it('blocks archived products and detects price changes', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, { stock: 2, price: 800_000, salePrice: null });
    const { token } = await register();

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1 });

    await request(app)
      .patch(`/api/v1/admin/products/${productId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ price: 900_000 });

    const preview = await request(app)
      .post('/api/v1/checkout/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingMethodId: 'express' });
    expect(preview.body.data.issues.some((i: { code: string }) => i.code === 'PRICE_CHANGED')).toBe(
      true,
    );

    const withoutAck = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingMethodId: 'express',
        paymentMethod: 'online',
        shippingAddress: address,
      });
    expect(withoutAck.status).toBe(409);
    expect(withoutAck.body.code).toBe('CHECKOUT_CHANGED');

    const withAck = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingMethodId: 'express',
        paymentMethod: 'online',
        shippingAddress: address,
        expectedTotal: preview.body.data.summary.total,
      });
    expect(withAck.status).toBe(201);
  });

  it('enforces ownership, cancellation restocks, and admin transitions', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, {
      price: 600_000,
      salePrice: null,
      stock: 3,
    });
    const owner = await register();
    const other = await register();

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ productId, quantity: 2 });

    const created = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        shippingMethodId: 'post-express',
        paymentMethod: 'online',
        shippingAddress: address,
      });
    const orderNumber = created.body.data.order.orderNumber as string;

    const stolen = await request(app)
      .get(`/api/v1/orders/${orderNumber}`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(stolen.status).toBe(404);

    const customerAdmin = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${owner.token}`);
    expect(customerAdmin.status).toBe(403);

    const cancelled = await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ reason: 'منصرف شدم' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.order.status).toBe('cancelled');
    expect((await Product.findById(productId))!.stock).toBe(3);

    const again = await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({});
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('ORDER_NOT_CANCELLABLE');
  });

  it('admin can progress status and reject invalid transitions', async () => {
    const admin = await adminToken();
    const productId = await seedProduct(admin, {
      price: 700_000,
      salePrice: null,
      stock: 2,
    });
    const { token } = await register();
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1 });
    const created = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingMethodId: 'post-express',
        paymentMethod: 'online',
        shippingAddress: address,
      });
    const orderNumber = created.body.data.order.orderNumber as string;

    const paid = await request(app)
      .patch(`/api/v1/admin/orders/${orderNumber}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'paid' });
    expect(paid.status).toBe(200);
    expect(paid.body.data.order.paymentStatus).toBe('paid');

    const invalid = await request(app)
      .patch(`/api/v1/admin/orders/${orderNumber}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'pending' });
    expect(invalid.status).toBe(409);
    expect(invalid.body.code).toBe('INVALID_ORDER_TRANSITION');

    const processing = await request(app)
      .patch(`/api/v1/admin/orders/${orderNumber}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'processing' });
    expect(processing.body.data.order.fulfillmentStatus).toBe('processing');
  });
});
