/**
 * MongoDB production-readiness tests.
 *
 * Uses MongoMemoryServer from tests/setup.ts — proves application behavior
 * around connection lifecycle, readiness, indexes, and shutdown flags.
 * It does NOT prove Atlas / replica-set / production cluster behavior.
 */
import mongoose from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import {
  beginShutdown,
  checkDbReady,
  connectDB,
  disconnectDB,
  getMongoConnectOptions,
  getMongoListenerCounts,
  INDEX_POLICY,
  resetDbLifecycleForTests,
} from '../src/config/db';
import {
  categorizeMongoError,
  sanitizeMongoUri,
  validateProductionMongoUri,
} from '../src/config/mongoSafety';
import { Cart } from '../src/models/Cart';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { User } from '../src/models/User';
import { Wishlist } from '../src/models/Wishlist';

const app = createApp();

function indexKeys(indexes: Array<{ key?: Record<string, unknown> }>): string[] {
  return indexes
    .map((idx) => JSON.stringify(idx.key ?? {}))
    .sort();
}

async function ensureModelIndexes(): Promise<void> {
  // Additive createIndexes only — never syncIndexes (which can drop).
  await Promise.all([
    User.createIndexes(),
    Category.createIndexes(),
    Product.createIndexes(),
    Cart.createIndexes(),
    Wishlist.createIndexes(),
  ]);
}

describe('Mongo URI safety', () => {
  it('sanitizes credentials from connection strings', () => {
    const raw =
      'mongodb+srv://luxora_user:s3cretPass@cluster0.example.mongodb.net/luxora?retryWrites=true';
    const safe = sanitizeMongoUri(raw);
    expect(safe).not.toContain('s3cretPass');
    expect(safe).not.toContain('luxora_user');
    expect(safe).toContain('***');
    expect(safe).not.toContain('retryWrites');
  });

  it('rejects localhost production URIs unless explicitly allowed', () => {
    expect(
      validateProductionMongoUri('mongodb://127.0.0.1:27017/luxora', false),
    ).toMatch(/localhost/i);
    expect(
      validateProductionMongoUri('mongodb://127.0.0.1:27017/luxora', true),
    ).toBeNull();
    expect(
      validateProductionMongoUri(
        'mongodb+srv://user:pass@cluster.mongodb.net/luxora',
        false,
      ),
    ).toBeNull();
    expect(validateProductionMongoUri('', false)).toMatch(/required/i);
  });

  it('categorizes Mongo failures without requiring secrets', () => {
    expect(
      categorizeMongoError({
        name: 'MongoServerSelectionError',
        message: 'Server selection timed out',
      }),
    ).toBe('server_selection');
    expect(
      categorizeMongoError({ name: 'MongoNetworkError', message: 'ECONNREFUSED' }),
    ).toBe('network');
    expect(categorizeMongoError({ code: 11000 })).toBe('duplicate_key');
  });
});

describe('Index policy', () => {
  it('never enables destructive syncIndexes on startup', () => {
    expect(INDEX_POLICY.syncIndexesOnStartup).toBe(false);
    expect(getMongoConnectOptions().autoIndex).toBe(INDEX_POLICY.autoIndex);
  });
});

describe('Connection initialization', () => {
  afterEach(() => {
    resetDbLifecycleForTests();
  });

  it('duplicate connectDB calls are safe and do not duplicate listeners', async () => {
    const before = getMongoListenerCounts();
    await connectDB();
    await connectDB();
    const after = getMongoListenerCounts();
    expect(after.connected).toBe(before.connected);
    expect(after.error).toBe(before.error);
    expect(after.disconnected).toBe(before.disconnected);
    expect(after.reconnected).toBe(before.reconnected);
    expect(await checkDbReady()).toBe(true);
  });
});

describe('Health / readiness semantics', () => {
  beforeEach(() => {
    resetDbLifecycleForTests();
  });

  afterEach(async () => {
    resetDbLifecycleForTests();
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.MONGODB_URI;
      if (uri) await connectDB(uri);
    }
  });

  it('GET /api/v1/health/live stays ok while process is alive', async () => {
    const res = await request(app).get('/api/v1/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('GET /api/v1/health/ready is ready when Mongo is up', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.db).toBe('connected');
    expect(res.body.dbAvailability).toBe('available');
    expect(res.body.draining).toBe(false);
  });

  it('GET /api/v1/health/ready returns 503 when Mongo is disconnected', async () => {
    await disconnectDB();
    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.db).not.toBe('connected');
  });

  it('beginShutdown makes READY fail while LIVE stays ok', async () => {
    beginShutdown();
    const live = await request(app).get('/api/v1/health/live');
    const ready = await request(app).get('/api/v1/health/ready');
    expect(live.status).toBe(200);
    expect(live.body.draining).toBe(true);
    expect(ready.status).toBe(503);
    expect(ready.body.status).toBe('not_ready');
    expect(ready.body.draining).toBe(true);
  });
});

describe('Mongo temporarily unavailable', () => {
  afterEach(async () => {
    mongoose.set('bufferCommands', true);
    resetDbLifecycleForTests();
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.MONGODB_URI;
      if (uri) await connectDB(uri);
    }
  });

  it('does not falsely succeed commerce reads when disconnected', async () => {
    mongoose.set('bufferCommands', false);
    await disconnectDB();

    await expect(User.findOne({ phone: '09120000000' }).exec()).rejects.toThrow();

    const ready = await request(app).get('/api/v1/health/ready');
    expect(ready.status).toBe(503);
  });

  it('reconnect restores readiness without duplicate listeners', async () => {
    const countsBefore = getMongoListenerCounts();
    await disconnectDB();
    expect(await checkDbReady()).toBe(false);

    const uri = process.env.MONGODB_URI;
    expect(uri).toBeTruthy();
    await connectDB(uri);
    expect(await checkDbReady()).toBe(true);

    const countsAfter = getMongoListenerCounts();
    expect(countsAfter.connected).toBe(countsBefore.connected);
    expect(countsAfter.error).toBe(countsBefore.error);

    const ready = await request(app).get('/api/v1/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.status).toBe('ready');
  });
});

describe('Index verification', () => {
  it('required commerce indexes exist (additive createIndexes only)', async () => {
    await ensureModelIndexes();

    const [userIdx, categoryIdx, productIdx, cartIdx, wishlistIdx] =
      await Promise.all([
        User.collection.indexes(),
        Category.collection.indexes(),
        Product.collection.indexes(),
        Cart.collection.indexes(),
        Wishlist.collection.indexes(),
      ]);

    const users = indexKeys(userIdx);
    expect(users).toContain(JSON.stringify({ phone: 1 }));
    expect(users).toContain(JSON.stringify({ email: 1 }));
    expect(users).toContain(JSON.stringify({ role: 1, isActive: 1 }));
    expect(users).toContain(JSON.stringify({ createdAt: -1 }));

    const categories = indexKeys(categoryIdx);
    expect(categories).toContain(JSON.stringify({ slug: 1 }));
    expect(categories).toContain(JSON.stringify({ isActive: 1, sortOrder: 1 }));

    const products = indexKeys(productIdx);
    expect(products).toContain(JSON.stringify({ slug: 1 }));
    expect(products).toContain(JSON.stringify({ sku: 1 }));
    expect(products).toContain(JSON.stringify({ status: 1, createdAt: -1 }));
    expect(products).toContain(
      JSON.stringify({ status: 1, category: 1, createdAt: -1 }),
    );
    expect(products).toContain(JSON.stringify({ status: 1, stock: 1 }));
    // Text index intentionally absent (regex search path).
    expect(products.some((k) => k.includes('"text"') || k.includes('_fts'))).toBe(
      false,
    );

    const carts = indexKeys(cartIdx);
    expect(carts).toContain(JSON.stringify({ user: 1 }));
    expect(carts).toContain(JSON.stringify({ 'items.product': 1 }));

    const wishlists = indexKeys(wishlistIdx);
    expect(wishlists).toContain(JSON.stringify({ user: 1 }));
    expect(wishlists).toContain(JSON.stringify({ products: 1 }));
  });

  it('unique ownership indexes enforce one cart / wishlist per user', async () => {
    const user = await User.create({
      firstName: 'A',
      lastName: 'B',
      phone: '09129990001',
      passwordHash: 'x'.repeat(60),
    });

    await Cart.create({ user: user._id, items: [] });
    await expect(Cart.create({ user: user._id, items: [] })).rejects.toMatchObject({
      code: 11000,
    });

    await Wishlist.create({ user: user._id, products: [] });
    await expect(
      Wishlist.create({ user: user._id, products: [] }),
    ).rejects.toMatchObject({ code: 11000 });
  });
});

describe('Connect options', () => {
  it('exposes conservative pool and timeout settings', () => {
    const options = getMongoConnectOptions();
    expect(options.maxPoolSize).toBeGreaterThan(0);
    expect(options.serverSelectionTimeoutMS).toBeGreaterThan(0);
    expect(options.connectTimeoutMS).toBeGreaterThan(0);
    expect(options.heartbeatFrequencyMS).toBeGreaterThan(0);
    expect(options.appName).toBeTruthy();
  });
});
