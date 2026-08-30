import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { Category } from '../src/models/Category';
import { seedCatalog } from '../src/scripts/seedCatalog';
import { CATALOG_MAX_LIMIT } from '../src/config/constants';

const app = createApp();

async function registerCustomer(
  overrides: Record<string, string> = {},
): Promise<{ token: string; userId: string }> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      firstName: 'سارا',
      lastName: 'محمدی',
      phone: '09121234567',
      email: 'customer@luxora.ir',
      password: 'demo1234a',
      ...overrides,
    });
  expect(res.status).toBe(201);
  return {
    token: res.body.data.accessToken as string,
    userId: res.body.data.user.id as string,
  };
}

async function createAdminToken(): Promise<string> {
  const { token, userId } = await registerCustomer({
    phone: '09129876543',
    email: 'admin@luxora.ir',
  });
  await User.findByIdAndUpdate(userId, { role: 'admin' });
  // Re-login so JWT carries admin role
  const login = await request(app).post('/api/v1/auth/login').send({
    identifier: 'admin@luxora.ir',
    password: 'demo1234a',
  });
  expect(login.status).toBe(200);
  expect(login.body.data.user.role).toBe('admin');
  return login.body.data.accessToken as string;
}

async function createCategory(
  adminToken: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await request(app)
    .post('/api/v1/admin/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'زنانه',
      slug: 'women',
      description: 'پوشاک زنانه',
      sortOrder: 1,
      ...overrides,
    });
  return res;
}

function baseProduct(categoryId: string, overrides: Record<string, unknown> = {}) {
  return {
    name: 'بلوز حریر',
    slug: 'silk-blend-blouse',
    sku: 'LX-WOM-003',
    categoryId,
    productKind: 'top',
    price: 1290000,
    currency: 'تومان',
    images: [
      {
        url: '/assets/images/products/silk-blouse.webp',
        alt: 'بلوز حریر',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    colors: [{ name: 'مشکی', hex: '#171717' }],
    sizes: ['S', 'M', 'L'],
    stock: 10,
    status: 'active',
    featured: false,
    ...overrides,
  };
}

describe('Category admin + public', () => {
  it('admin can create and list categories; guest cannot create', async () => {
    const adminToken = await createAdminToken();
    const created = await createCategory(adminToken);
    expect(created.status).toBe(201);
    expect(created.body.data.category.slug).toBe('women');

    const guest = await request(app)
      .post('/api/v1/admin/categories')
      .send({ name: 'مردانه', slug: 'men' });
    expect(guest.status).toBe(401);

    const publicList = await request(app).get('/api/v1/categories');
    expect(publicList.status).toBe(200);
    expect(publicList.body.data.items).toHaveLength(1);
    expect(publicList.body.data.items[0].slug).toBe('women');
  });

  it('rejects duplicate category slug', async () => {
    const adminToken = await createAdminToken();
    await createCategory(adminToken);
    const dup = await createCategory(adminToken, { name: 'زنانه ۲' });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('CONFLICT');
  });

  it('deactivating a category hides it publicly but keeps products', async () => {
    const adminToken = await createAdminToken();
    const cat = await createCategory(adminToken);
    const categoryId = cat.body.data.category.id as string;

    const product = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseProduct(categoryId));
    expect(product.status).toBe(201);

    const deactivated = await request(app)
      .delete(`/api/v1/admin/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.data.category.isActive).toBe(false);

    const publicCat = await request(app).get('/api/v1/categories/women');
    expect(publicCat.status).toBe(404);

    const publicProducts = await request(app).get('/api/v1/products');
    expect(publicProducts.status).toBe(200);
    expect(publicProducts.body.data.items).toHaveLength(1);

    const adminStillSees = await request(app)
      .get(`/api/v1/admin/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminStillSees.status).toBe(200);
    expect(adminStillSees.body.data.category.isActive).toBe(false);
  });
});

describe('Product admin mutations + authz', () => {
  it('customer cannot mutate products; admin can create/update/archive', async () => {
    const adminToken = await createAdminToken();
    const { token: customerToken } = await registerCustomer();
    const cat = await createCategory(adminToken);
    const categoryId = cat.body.data.category.id as string;

    const denied = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(baseProduct(categoryId));
    expect(denied.status).toBe(403);

    const created = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        baseProduct(categoryId, {
          salePrice: 990000,
          featured: true,
        }),
      );
    expect(created.status).toBe(201);
    expect(created.body.data.product.onSale).toBe(true);
    expect(created.body.data.product.displayPrice).toBe(990000);
    expect(created.body.data.product.originalPrice).toBe(1290000);
    expect(JSON.stringify(created.body)).not.toContain('passwordHash');

    const id = created.body.data.product.id as string;

    const updated = await request(app)
      .patch(`/api/v1/admin/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stock: 3, featured: true });
    expect(updated.status).toBe(200);
    expect(updated.body.data.product.stock).toBe(3);
    expect(updated.body.data.product.availability).toBe('low_stock');

    const archived = await request(app)
      .delete(`/api/v1/admin/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(archived.status).toBe(200);
    expect(archived.body.data.product.status).toBe('archived');

    const publicMissing = await request(app).get(
      '/api/v1/products/silk-blend-blouse',
    );
    expect(publicMissing.status).toBe(404);

    const adminStill = await request(app)
      .get(`/api/v1/admin/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminStill.status).toBe(200);
    expect(adminStill.body.data.product.status).toBe('archived');
  });

  it('rejects duplicate sku and slug', async () => {
    const adminToken = await createAdminToken();
    const cat = await createCategory(adminToken);
    const categoryId = cat.body.data.category.id as string;

    await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseProduct(categoryId));

    const dupSku = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseProduct(categoryId, { slug: 'other-slug', name: 'دیگر' }));
    expect(dupSku.status).toBe(409);

    const dupSlug = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseProduct(categoryId, { sku: 'LX-OTHER-1', name: 'دیگر' }));
    expect(dupSlug.status).toBe(409);
  });

  it('rejects invalid category, negative stock, and salePrice > price', async () => {
    const adminToken = await createAdminToken();
    const cat = await createCategory(adminToken);
    const categoryId = cat.body.data.category.id as string;

    const badCategory = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseProduct('aaaaaaaaaaaaaaaaaaaaaaaa'));
    expect(badCategory.status).toBe(404);

    const negativeStock = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseProduct(categoryId, { stock: -1 }));
    expect(negativeStock.status).toBe(422);

    const badSale = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseProduct(categoryId, { salePrice: 5_000_000 }));
    expect(badSale.status).toBe(422);

    const negativePrice = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseProduct(categoryId, { price: -10, slug: 'neg', sku: 'LX-NEG-1' }));
    expect(negativePrice.status).toBe(422);
  });
});

describe('Public catalog query', () => {
  async function seedFixture(adminToken: string) {
    const women = await createCategory(adminToken);
    const men = await createCategory(adminToken, {
      name: 'مردانه',
      slug: 'men',
      sortOrder: 2,
    });
    const womenId = women.body.data.category.id as string;
    const menId = men.body.data.category.id as string;

    await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        baseProduct(womenId, {
          name: 'بلوز حریر',
          slug: 'silk-blend-blouse',
          sku: 'LX-WOM-003',
          price: 1290000,
          featured: true,
          productKind: 'top',
          stock: 10,
        }),
      );
    await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        baseProduct(womenId, {
          name: 'پالتو پشمی',
          slug: 'tailored-wool-coat',
          sku: 'LX-WOM-007',
          price: 4290000,
          salePrice: 3490000,
          featured: false,
          productKind: 'outerwear',
          stock: 5,
        }),
      );
    await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        baseProduct(menId, {
          name: 'شلوار لینن',
          slug: 'linen-trousers',
          sku: 'LX-MEN-004',
          price: 890000,
          featured: true,
          productKind: 'bottom',
          stock: 0,
          status: 'active',
        }),
      );
    await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        baseProduct(menId, {
          name: 'پیراهن پیش‌نویس',
          slug: 'draft-shirt',
          sku: 'LX-MEN-DRAFT',
          price: 500000,
          status: 'draft',
        }),
      );
  }

  it('lists only active products with pagination', async () => {
    const adminToken = await createAdminToken();
    await seedFixture(adminToken);

    const res = await request(app).get('/api/v1/products?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.pagination).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
    expect(
      res.body.data.items.every(
        (item: { status: string }) => item.status === 'active',
      ),
    ).toBe(true);
  });

  it('supports search, category, price, featured, kind, sort', async () => {
    const adminToken = await createAdminToken();
    await seedFixture(adminToken);

    const search = await request(app).get('/api/v1/products?search=پالتو');
    expect(search.status).toBe(200);
    expect(search.body.data.items).toHaveLength(1);
    expect(search.body.data.items[0].slug).toBe('tailored-wool-coat');

    const byCategory = await request(app).get('/api/v1/products?category=men');
    expect(byCategory.body.data.items).toHaveLength(1);
    expect(byCategory.body.data.items[0].slug).toBe('linen-trousers');

    const byPrice = await request(app).get(
      '/api/v1/products?minPrice=1000000&maxPrice=2000000',
    );
    expect(byPrice.body.data.items.map((p: { slug: string }) => p.slug)).toEqual([
      'silk-blend-blouse',
    ]);

    const featured = await request(app).get('/api/v1/products?featured=true');
    expect(featured.body.data.items).toHaveLength(2);

    const kind = await request(app).get('/api/v1/products?kind=outerwear');
    expect(kind.body.data.items).toHaveLength(1);

    const priceAsc = await request(app).get('/api/v1/products?sort=price_asc');
    const prices = priceAsc.body.data.items.map(
      (p: { price: number }) => p.price,
    );
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    const bySlug = await request(app).get('/api/v1/products/silk-blend-blouse');
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.data.product.sku).toBe('LX-WOM-003');
    expect(bySlug.body.data.product.href).toBe('/product/silk-blend-blouse');
  });

  it('rejects malformed query and excessive limits', async () => {
    const badSort = await request(app).get('/api/v1/products?sort=hacked');
    expect(badSort.status).toBe(422);

    const tooBig = await request(app).get(
      `/api/v1/products?limit=${CATALOG_MAX_LIMIT + 1}`,
    );
    expect(tooBig.status).toBe(422);

    const badPrice = await request(app).get(
      '/api/v1/products?minPrice=500&maxPrice=100',
    );
    expect(badPrice.status).toBe(422);

    const statusLeak = await request(app).get('/api/v1/products?status=draft');
    expect(statusLeak.status).toBe(400);
  });
});

describe('Seed idempotency', () => {
  it('seeds once and does not duplicate on second run', async () => {
    await seedCatalog();
    await seedCatalog();

    expect(await Category.countDocuments()).toBe(5);
    expect(await Product.countDocuments()).toBe(10);
    expect(await Product.countDocuments({ status: 'active' })).toBe(8);

    const publicList = await request(app).get('/api/v1/products?limit=48');
    expect(publicList.status).toBe(200);
    expect(publicList.body.data.pagination.total).toBe(8);
  });
});
