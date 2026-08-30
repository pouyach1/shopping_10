import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { CART_MAX_QUANTITY } from '../src/config/constants';

const app = createApp();

async function register(
  overrides: Record<string, string> = {},
): Promise<{ token: string; userId: string }> {
  const phone = overrides.phone ?? `0912${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
  const email =
    overrides.email ?? `user-${Math.random().toString(36).slice(2)}@luxora.ir`;
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
    phone: '09121110000',
    email: 'admin-cart@luxora.ir',
  });
  await User.findByIdAndUpdate(userId, { role: 'admin' });
  const login = await request(app).post('/api/v1/auth/login').send({
    identifier: 'admin-cart@luxora.ir',
    password: 'demo1234a',
  });
  expect(login.status).toBe(200);
  return login.body.data.accessToken as string;
}

async function seedActiveProduct(
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; categoryId: string }> {
  const cat = await request(app)
    .post('/api/v1/admin/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'زنانه',
      slug: `women-${Math.random().toString(36).slice(2, 7)}`,
      sortOrder: 1,
    });
  expect(cat.status).toBe(201);
  const categoryId = cat.body.data.category.id as string;

  const product = await request(app)
    .post('/api/v1/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'بلوز حریر',
      slug: `silk-${Math.random().toString(36).slice(2, 8)}`,
      sku: `LX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      categoryId,
      productKind: 'top',
      price: 1290000,
      salePrice: 990000,
      currency: 'تومان',
      images: [
        {
          url: '/assets/images/products/silk-blouse.webp',
          alt: 'بلوز',
          isPrimary: true,
        },
      ],
      stock: 10,
      status: 'active',
      ...overrides,
    });
  expect(product.status).toBe(201);
  return { id: product.body.data.product.id as string, categoryId };
}

describe('Cart authz + ownership', () => {
  it('rejects unauthenticated cart access', async () => {
    const res = await request(app).get('/api/v1/cart');
    expect(res.status).toBe(401);
  });

  it('isolates carts between users', async () => {
    const admin = await adminToken();
    const { id: productId } = await seedActiveProduct(admin);
    const a = await register();
    const b = await register();

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ productId, quantity: 2 });

    const cartB = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${b.token}`);
    expect(cartB.status).toBe(200);
    expect(cartB.body.data.items).toHaveLength(0);

    const cartA = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${a.token}`);
    expect(cartA.body.data.items).toHaveLength(1);
    expect(cartA.body.data.summary.itemCount).toBe(2);
  });
});

describe('Cart mutations', () => {
  it('adds, increments same line, updates, removes, clears with authoritative pricing', async () => {
    const admin = await adminToken();
    const { id: productId } = await seedActiveProduct(admin);
    const { token } = await register();

    const add1 = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1, size: 'M', color: 'مشکی' });
    expect(add1.status).toBe(200);
    expect(add1.body.data.items).toHaveLength(1);
    expect(add1.body.data.items[0].unitPrice).toBe(990000);
    expect(add1.body.data.items[0].price).toBe(990000);
    expect(add1.body.data.items[0].lineTotal).toBe(990000);
    expect(add1.body.data.summary.subtotal).toBe(990000);

    const add2 = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2, size: 'M', color: 'مشکی' });
    expect(add2.body.data.items).toHaveLength(1);
    expect(add2.body.data.items[0].quantity).toBe(3);
    expect(add2.body.data.summary.itemCount).toBe(3);
    expect(add2.body.data.summary.subtotal).toBe(990000 * 3);

    // Different variant → new line
    const addVariant = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1, size: 'L', color: 'مشکی' });
    expect(addVariant.body.data.items).toHaveLength(2);

    const updated = await request(app)
      .patch(`/api/v1/cart/items/${productId}`)
      .query({ size: 'M', color: 'مشکی' })
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 1 });
    expect(updated.status).toBe(200);
    const mLine = updated.body.data.items.find(
      (i: { size: string }) => i.size === 'M',
    );
    expect(mLine.quantity).toBe(1);

    const removed = await request(app)
      .delete(`/api/v1/cart/items/${productId}`)
      .query({ size: 'L', color: 'مشکی' })
      .set('Authorization', `Bearer ${token}`);
    expect(removed.body.data.items).toHaveLength(1);

    const cleared = await request(app)
      .delete('/api/v1/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(cleared.body.data.items).toHaveLength(0);
    expect(cleared.body.data.summary.subtotal).toBe(0);
  });

  it('rejects invalid quantities and insufficient stock', async () => {
    const admin = await adminToken();
    const { id: productId } = await seedActiveProduct(admin, { stock: 3 });
    const { token } = await register();

    const zero = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 0 });
    expect(zero.status).toBe(422);

    const negative = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: -2 });
    expect(negative.status).toBe(422);

    const tooMany = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: CART_MAX_QUANTITY + 1 });
    expect(tooMany.status).toBe(422);

    const overStock = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 5 });
    expect(overStock.status).toBe(409);

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 3 });

    const incrementOver = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1 });
    expect(incrementOver.status).toBe(409);
  });

  it('rejects missing, draft, and archived products on add', async () => {
    const admin = await adminToken();
    const { token } = await register();

    const missing = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'aaaaaaaaaaaaaaaaaaaaaaaa', quantity: 1 });
    expect(missing.status).toBe(404);

    const { id: draftId } = await seedActiveProduct(admin, {
      status: 'draft',
      slug: `draft-${Math.random().toString(36).slice(2, 8)}`,
      sku: `DR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    });
    const draft = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: draftId, quantity: 1 });
    expect(draft.status).toBe(409);

    const { id: activeId } = await seedActiveProduct(admin, {
      slug: `arch-${Math.random().toString(36).slice(2, 8)}`,
      sku: `AR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    });
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: activeId, quantity: 1 });

    await request(app)
      .delete(`/api/v1/admin/products/${activeId}`)
      .set('Authorization', `Bearer ${admin}`);

    const afterArchive = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(afterArchive.status).toBe(200);
    expect(afterArchive.body.data.items).toHaveLength(1);
    expect(afterArchive.body.data.items[0].available).toBe(false);
    expect(afterArchive.body.data.items[0].purchasable).toBe(false);
    expect(afterArchive.body.data.summary.subtotal).toBe(0);
    expect(afterArchive.body.data.summary.hasUnavailableItems).toBe(true);
  });

  it('merges guest lines with stock caps', async () => {
    const admin = await adminToken();
    const { id: productId } = await seedActiveProduct(admin, { stock: 5 });
    const { token } = await register();

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2 });

    const merged = await request(app)
      .post('/api/v1/cart/merge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId, quantity: 10 }],
      });
    expect(merged.status).toBe(200);
    expect(merged.body.data.items[0].quantity).toBe(5);
  });

  it('detects price changes via snapshot', async () => {
    const admin = await adminToken();
    const { id: productId } = await seedActiveProduct(admin, {
      price: 2000000,
      salePrice: null,
    });
    const { token } = await register();

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1 });

    await request(app)
      .patch(`/api/v1/admin/products/${productId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ price: 2500000 });

    const cart = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(cart.body.data.items[0].unitPrice).toBe(2500000);
    expect(cart.body.data.items[0].priceChanged).toBe(true);
    expect(cart.body.data.summary.hasPriceChanges).toBe(true);
  });
});

describe('Wishlist', () => {
  it('rejects guest and supports add/list/duplicate/remove isolation', async () => {
    const guest = await request(app).get('/api/v1/wishlist');
    expect(guest.status).toBe(401);

    const admin = await adminToken();
    const { id: productId } = await seedActiveProduct(admin);
    const a = await register();
    const b = await register();

    const added = await request(app)
      .post(`/api/v1/wishlist/${productId}`)
      .set('Authorization', `Bearer ${a.token}`);
    expect(added.status).toBe(200);
    expect(added.body.data.itemCount).toBe(1);
    expect(added.body.data.items[0].price).toBe(990000);

    const dup = await request(app)
      .post(`/api/v1/wishlist/${productId}`)
      .set('Authorization', `Bearer ${a.token}`);
    expect(dup.status).toBe(200);
    expect(dup.body.data.itemCount).toBe(1);

    const bList = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${b.token}`);
    expect(bList.body.data.itemCount).toBe(0);

    const removed = await request(app)
      .delete(`/api/v1/wishlist/${productId}`)
      .set('Authorization', `Bearer ${a.token}`);
    expect(removed.body.data.itemCount).toBe(0);

    const removeAgain = await request(app)
      .delete(`/api/v1/wishlist/${productId}`)
      .set('Authorization', `Bearer ${a.token}`);
    expect(removeAgain.status).toBe(200);

    const missing = await request(app)
      .post('/api/v1/wishlist/aaaaaaaaaaaaaaaaaaaaaaaa')
      .set('Authorization', `Bearer ${a.token}`);
    expect(missing.status).toBe(404);
  });

  it('keeps archived products on wishlist as unavailable', async () => {
    const admin = await adminToken();
    const { id: productId } = await seedActiveProduct(admin);
    const { token } = await register();

    await request(app)
      .post(`/api/v1/wishlist/${productId}`)
      .set('Authorization', `Bearer ${token}`);

    await request(app)
      .delete(`/api/v1/admin/products/${productId}`)
      .set('Authorization', `Bearer ${admin}`);

    const list = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.data.itemCount).toBe(1);
    expect(list.body.data.items[0].available).toBe(false);
  });

  it('merges unique product ids', async () => {
    const admin = await adminToken();
    const p1 = await seedActiveProduct(admin);
    const p2 = await seedActiveProduct(admin, {
      slug: `w2-${Math.random().toString(36).slice(2, 8)}`,
      sku: `W2-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    });
    const { token } = await register();

    await request(app)
      .post(`/api/v1/wishlist/${p1.id}`)
      .set('Authorization', `Bearer ${token}`);

    const merged = await request(app)
      .post('/api/v1/wishlist/merge')
      .set('Authorization', `Bearer ${token}`)
      .send({ productIds: [p1.id, p2.id, p1.id] });
    expect(merged.status).toBe(200);
    expect(merged.body.data.itemCount).toBe(2);
  });
});
