/**
 * Cross-tenant isolation suite.
 * Proves Store A cannot read/mutate Store B tenant-owned data.
 */
import { Types } from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { STORE_SLUG_HEADER } from '../src/config/constants';
import { Coupon } from '../src/models/Coupon';
import { NotificationDelivery } from '../src/models/NotificationDelivery';
import { Order } from '../src/models/Order';
import { Payment } from '../src/models/Payment';
import { PaymentProviderEvent } from '../src/models/PaymentProviderEvent';
import { Product } from '../src/models/Product';
import { Refund } from '../src/models/Refund';
import { Store } from '../src/models/Store';
import { User } from '../src/models/User';
import {
  ensureStore,
  promoteStoreAdmin,
} from '../src/services/storeBootstrap.service';
import {
  allocateOrderNumber,
  claimIdempotencyKey,
  decrementStoreStock,
  findCouponByCode,
  findOrderForStore,
  findPaymentForStore,
  listAuditForStore,
  resolveStorePaymentBinding,
  writeAuditLog,
} from '../src/services/tenantCommerce.service';
import { runWithTenantContext } from '../src/tenant/TenantContext';

const app = createApp();

function isolationAddress() {
  return {
    recipientName: 'Test',
    phone: '09120000000',
    province: 'تهران',
    city: 'تهران',
    addressLine: 'آدرس تست',
  };
}

function isolationOrder(
  storeId: Types.ObjectId,
  orderNumber: string,
  total: number,
) {
  return {
    storeId,
    orderNumber,
    user: storeId,
    status: 'pending' as const,
    paymentStatus: 'unpaid' as const,
    fulfillmentStatus: 'unfulfilled' as const,
    items: [],
    shippingAddress: isolationAddress(),
    shippingMethodId: 'post-express' as const,
    shippingMethodTitle: 'پست پیشتاز',
    paymentMethod: 'online' as const,
    itemCount: 0,
    subtotal: total,
    discountTotal: 0,
    couponDiscount: 0,
    shippingCost: 0,
    total,
    financialIntegrityStatus: 'ok' as const,
  };
}

async function register(storeSlug: string, phone: string, email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .set(STORE_SLUG_HEADER, storeSlug)
    .send({
      firstName: 'Test',
      lastName: 'User',
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

async function adminFor(storeSlug: string, phone: string, email: string) {
  const { token, userId } = await register(storeSlug, phone, email);
  const store = await Store.findOne({ slug: storeSlug });
  expect(store).toBeTruthy();
  await promoteStoreAdmin(String(store!._id), userId, 'admin');
  await User.findByIdAndUpdate(userId, { role: 'admin' });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .set(STORE_SLUG_HEADER, storeSlug)
    .send({ identifier: email, password: 'demo1234a' });
  expect(login.status).toBe(200);
  return {
    token: login.body.data.accessToken as string,
    userId,
    storeId: String(store!._id),
  };
}

async function createProductInStore(
  storeSlug: string,
  adminToken: string,
  slug: string,
  sku: string,
) {
  const cat = await request(app)
    .post('/api/v1/admin/categories')
    .set(STORE_SLUG_HEADER, storeSlug)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `Cat ${slug}`, slug: `cat-${slug}`, sortOrder: 1 });
  expect(cat.status).toBe(201);
  const categoryId = cat.body.data.category.id as string;

  const product = await request(app)
    .post('/api/v1/admin/products')
    .set(STORE_SLUG_HEADER, storeSlug)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Product ${slug}`,
      slug,
      sku,
      categoryId,
      productKind: 'other',
      price: 100_000,
      currency: 'تومان',
      stock: 10,
      status: 'active',
      images: [{ url: '/x.webp', isPrimary: true, sortOrder: 0 }],
    });
  expect(product.status).toBe(201);
  return product.body.data.product as { id: string; slug: string };
}

describe('Multi-tenant isolation', () => {
  it('products and categories are isolated by store', async () => {
    const storeA = await ensureStore({
      slug: 'store-a',
      name: 'Store A',
      orderPrefix: 'LUXA',
    });
    const storeB = await ensureStore({
      slug: 'store-b',
      name: 'Store B',
      orderPrefix: 'LUXB',
    });
    expect(String(storeA._id)).not.toBe(String(storeB._id));

    const adminA = await adminFor('store-a', '09120000001', 'a-admin@t.ir');
    const adminB = await adminFor('store-b', '09120000002', 'b-admin@t.ir');

    const productA = await createProductInStore(
      'store-a',
      adminA.token,
      'shared-slug',
      'SHARED-SKU',
    );
    const productB = await createProductInStore(
      'store-b',
      adminB.token,
      'shared-slug',
      'SHARED-SKU',
    );
    expect(productA.id).not.toBe(productB.id);

    const publicA = await request(app)
      .get('/api/v1/products/shared-slug')
      .set(STORE_SLUG_HEADER, 'store-a');
    const publicB = await request(app)
      .get('/api/v1/products/shared-slug')
      .set(STORE_SLUG_HEADER, 'store-b');
    expect(publicA.status).toBe(200);
    expect(publicB.status).toBe(200);
    expect(publicA.body.data.product.id).toBe(productA.id);
    expect(publicB.body.data.product.id).toBe(productB.id);

    // Store B admin cannot read Store A product by id.
    const leak = await request(app)
      .get(`/api/v1/admin/products/${productA.id}`)
      .set(STORE_SLUG_HEADER, 'store-b')
      .set('Authorization', `Bearer ${adminB.token}`);
    expect(leak.status).toBe(404);

    // Store B admin cannot patch Store A product.
    const mutate = await request(app)
      .patch(`/api/v1/admin/products/${productA.id}`)
      .set(STORE_SLUG_HEADER, 'store-b')
      .set('Authorization', `Bearer ${adminB.token}`)
      .send({ name: 'Hacked' });
    expect(mutate.status).toBe(404);

    const stillA = await Product.findById(productA.id);
    expect(stillA?.name).toBe('Product shared-slug');
  });

  it('same user has independent carts and wishlists per store', async () => {
    await ensureStore({ slug: 'store-a', name: 'Store A', orderPrefix: 'LUXA' });
    await ensureStore({ slug: 'store-b', name: 'Store B', orderPrefix: 'LUXB' });
    const adminA = await adminFor('store-a', '09120000011', 'a2@t.ir');
    const adminB = await adminFor('store-b', '09120000012', 'b2@t.ir');
    const productA = await createProductInStore(
      'store-a',
      adminA.token,
      'cart-a',
      'CART-A',
    );
    const productB = await createProductInStore(
      'store-b',
      adminB.token,
      'cart-b',
      'CART-B',
    );

    // Same phone/email cannot register twice — use one user, login into both store contexts.
    const { token, userId } = await register(
      'store-a',
      '09120000013',
      'shopper@t.ir',
    );
    void userId;

    await request(app)
      .post('/api/v1/cart/items')
      .set(STORE_SLUG_HEADER, 'store-a')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productA.id, quantity: 1 });

    // Product B must not attach to Store A cart.
    const crossAdd = await request(app)
      .post('/api/v1/cart/items')
      .set(STORE_SLUG_HEADER, 'store-a')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productB.id, quantity: 1 });
    expect(crossAdd.status).toBe(404);

    await request(app)
      .post('/api/v1/cart/items')
      .set(STORE_SLUG_HEADER, 'store-b')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productB.id, quantity: 2 });

    const cartA = await request(app)
      .get('/api/v1/cart')
      .set(STORE_SLUG_HEADER, 'store-a')
      .set('Authorization', `Bearer ${token}`);
    const cartB = await request(app)
      .get('/api/v1/cart')
      .set(STORE_SLUG_HEADER, 'store-b')
      .set('Authorization', `Bearer ${token}`);
    expect(cartA.body.data.items).toHaveLength(1);
    expect(cartA.body.data.items[0].productId).toBe(productA.id);
    expect(cartB.body.data.items).toHaveLength(1);
    expect(cartB.body.data.items[0].quantity).toBe(2);

    await request(app)
      .post(`/api/v1/wishlist/${productA.id}`)
      .set(STORE_SLUG_HEADER, 'store-a')
      .set('Authorization', `Bearer ${token}`);
    await request(app)
      .post(`/api/v1/wishlist/${productB.id}`)
      .set(STORE_SLUG_HEADER, 'store-b')
      .set('Authorization', `Bearer ${token}`);

    const wishA = await request(app)
      .get('/api/v1/wishlist')
      .set(STORE_SLUG_HEADER, 'store-a')
      .set('Authorization', `Bearer ${token}`);
    const wishB = await request(app)
      .get('/api/v1/wishlist')
      .set(STORE_SLUG_HEADER, 'store-b')
      .set('Authorization', `Bearer ${token}`);
    expect(wishA.body.data.itemCount).toBe(1);
    expect(wishB.body.data.itemCount).toBe(1);
    expect(wishA.body.data.items[0].productId).toBe(productA.id);
  });

  it('rejects body storeId smuggling and role escalation JSON', async () => {
    await ensureStore({ slug: 'store-a', name: 'A', orderPrefix: 'LUXA' });
    const { token } = await register('store-a', '09120000021', 'esc@t.ir');
    const escalate = await request(app)
      .patch('/api/v1/users/me')
      .set(STORE_SLUG_HEADER, 'store-a')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin', storeId: '000000000000000000000099' });
    expect(escalate.status).toBe(400);
  });

  it('coupons, payments, orders, refunds, notifications, audit, idempotency isolated', async () => {
    const storeA = await ensureStore({
      slug: 'iso-a',
      name: 'Iso A',
      orderPrefix: 'ISOA',
    });
    const storeB = await ensureStore({
      slug: 'iso-b',
      name: 'Iso B',
      orderPrefix: 'ISOB',
    });

    await Coupon.create({
      storeId: storeA._id,
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
    });
    await Coupon.create({
      storeId: storeB._id,
      code: 'WELCOME10',
      type: 'percentage',
      value: 15,
    });

    const couponA = await runWithTenantContext(
      {
        storeId: String(storeA._id),
        storeSlug: 'iso-a',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      () => findCouponByCode('WELCOME10'),
    );
    const couponB = await runWithTenantContext(
      {
        storeId: String(storeB._id),
        storeSlug: 'iso-b',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      () => findCouponByCode('WELCOME10'),
    );
    expect(couponA?.value).toBe(10);
    expect(couponB?.value).toBe(15);

    const orderA = await Order.create(
      isolationOrder(storeA._id, 'ISOA-2026-000001', 1000),
    );
    const orderB = await Order.create(
      isolationOrder(storeB._id, 'ISOB-2026-000001', 2000),
    );

    await expect(
      runWithTenantContext(
        {
          storeId: String(storeB._id),
          storeSlug: 'iso-b',
          storeStatus: 'active',
          resolution: 'explicit',
        },
        () => findOrderForStore(String(orderA._id)),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    const numA = await runWithTenantContext(
      {
        storeId: String(storeA._id),
        storeSlug: 'iso-a',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      () => allocateOrderNumber(1),
    );
    const numB = await runWithTenantContext(
      {
        storeId: String(storeB._id),
        storeSlug: 'iso-b',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      () => allocateOrderNumber(1),
    );
    expect(numA).toBe('ISOA-2026-000001');
    expect(numB).toBe('ISOB-2026-000001');

    const paymentA = await Payment.create({
      storeId: storeA._id,
      order: orderA._id,
      orderNumber: orderA.orderNumber,
      user: storeA._id,
      authority: 'AUTH-1',
      provider: 'zarinpal',
      amount: 1000,
      status: 'created',
    });
    await Payment.create({
      storeId: storeB._id,
      order: orderB._id,
      orderNumber: orderB.orderNumber,
      user: storeB._id,
      authority: 'AUTH-1',
      provider: 'zarinpal',
      amount: 2000,
      status: 'created',
    });

    await expect(
      runWithTenantContext(
        {
          storeId: String(storeB._id),
          storeSlug: 'iso-b',
          storeStatus: 'active',
          resolution: 'explicit',
        },
        () => findPaymentForStore(String(paymentA._id)),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    const refundA = await Refund.create({
      storeId: storeA._id,
      payment: paymentA._id,
      order: orderA._id,
      orderNumber: orderA.orderNumber,
      user: storeA._id,
      amount: 100,
      status: 'pending',
      idempotencyKey: 'refund-iso-a',
      requestedBy: storeA._id,
    });
    const refundFromB = await runWithTenantContext(
      {
        storeId: String(storeB._id),
        storeSlug: 'iso-b',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      async () => {
        const { assertRefundInStore } = await import(
          '../src/services/tenantCommerce.service'
        );
        return assertRefundInStore(String(refundA._id)).catch((e: unknown) => e);
      },
    );
    expect(refundFromB).toMatchObject({ statusCode: 404 });

    await NotificationDelivery.create({
      storeId: storeA._id,
      deliveryKey: 'welcome-1',
      event: 'OrderCreated',
      channel: 'email',
      recipient: 'iso-a@t.ir',
      body: 'ok',
      status: 'sent',
    });
    await NotificationDelivery.create({
      storeId: storeB._id,
      deliveryKey: 'welcome-1',
      event: 'OrderCreated',
      channel: 'email',
      recipient: 'iso-b@t.ir',
      body: 'ok',
      status: 'sent',
    });

    await runWithTenantContext(
      {
        storeId: String(storeA._id),
        storeSlug: 'iso-a',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      () =>
        writeAuditLog({
          action: 'order.created',
          resourceType: 'order',
          resourceId: 'x',
        }),
    );
    await runWithTenantContext(
      {
        storeId: String(storeB._id),
        storeSlug: 'iso-b',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      () =>
        writeAuditLog({
          action: 'order.created',
          resourceType: 'order',
          resourceId: 'y',
        }),
    );
    const auditsA = await runWithTenantContext(
      {
        storeId: String(storeA._id),
        storeSlug: 'iso-a',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      () => listAuditForStore(),
    );
    expect(auditsA.every((row) => String(row.storeId) === String(storeA._id))).toBe(
      true,
    );
    expect(auditsA).toHaveLength(1);

    await runWithTenantContext(
      {
        storeId: String(storeA._id),
        storeSlug: 'iso-a',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      () => claimIdempotencyKey('same-key', 'checkout'),
    );
    await runWithTenantContext(
      {
        storeId: String(storeB._id),
        storeSlug: 'iso-b',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      () => claimIdempotencyKey('same-key', 'checkout'),
    );
    await expect(
      runWithTenantContext(
        {
          storeId: String(storeA._id),
          storeSlug: 'iso-a',
          storeStatus: 'active',
          resolution: 'explicit',
        },
        () => claimIdempotencyKey('same-key', 'checkout'),
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    await PaymentProviderEvent.create({
      storeId: storeA._id,
      provider: 'zarinpal',
      eventId: 'evt-1',
      payloadHash: 'hash-a',
      processedAt: new Date(),
      outcome: 'processed',
    });
    await PaymentProviderEvent.create({
      storeId: storeB._id,
      provider: 'zarinpal',
      eventId: 'evt-1',
      payloadHash: 'hash-b',
      processedAt: new Date(),
      outcome: 'processed',
    });

    const bindingA = await runWithTenantContext(
      {
        storeId: String(storeA._id),
        storeSlug: 'iso-a',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      () => resolveStorePaymentBinding(),
    );
    expect(bindingA.provider).toBe('none');
    expect(
      JSON.stringify(bindingA).toLowerCase().includes('secret'),
    ).toBe(false);
  });

  it('inventory decrement is store-scoped', async () => {
    const storeA = await ensureStore({
      slug: 'inv-a',
      name: 'Inv A',
      orderPrefix: 'INVA',
    });
    const storeB = await ensureStore({
      slug: 'inv-b',
      name: 'Inv B',
      orderPrefix: 'INVB',
    });
    const adminA = await adminFor('inv-a', '09120000031', 'inv-a@t.ir');
    const adminB = await adminFor('inv-b', '09120000032', 'inv-b@t.ir');
    const productA = await createProductInStore(
      'inv-a',
      adminA.token,
      'stock-item',
      'STK-A',
    );
    const productB = await createProductInStore(
      'inv-b',
      adminB.token,
      'stock-item',
      'STK-B',
    );

    const ok = await runWithTenantContext(
      {
        storeId: String(storeA._id),
        storeSlug: 'inv-a',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      () => decrementStoreStock(productA.id, 3),
    );
    expect(ok).toBe(true);

    const cross = await runWithTenantContext(
      {
        storeId: String(storeA._id),
        storeSlug: 'inv-a',
        storeStatus: 'active',
        resolution: 'explicit',
      },
      () => decrementStoreStock(productB.id, 1),
    );
    expect(cross).toBe(false);

    const docA = await Product.findById(productA.id);
    const docB = await Product.findById(productB.id);
    expect(docA?.stock).toBe(7);
    expect(docB?.stock).toBe(10);
  });

  it('GET /api/v1/store returns public config without private secrets', async () => {
    await ensureStore({ slug: 'pub-a', name: 'Pub A', orderPrefix: 'PUBA' });
    const res = await request(app)
      .get('/api/v1/store')
      .set(STORE_SLUG_HEADER, 'pub-a');
    expect(res.status).toBe(200);
    expect(res.body.data.store.slug).toBe('pub-a');
    expect(res.body.data.store.config.orderPrefix).toBe('PUBA');
    expect(res.body.data.store.privateConfig).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/credentialsConfigured/);
  });
});
