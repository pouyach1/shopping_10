import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

import { createApp } from '../src/app';
import {
  connectDB,
  disconnectDB,
  sanitizeMongoUri,
  checkDbReady,
  ensureIndexes,
  syncIndexesForTestsOnly,
  buildMongoConnectOptions,
  getDbState,
  resetDbListenerGuardForTests,
  isDbReady,
} from '../src/config/db';
import { env } from '../src/config/env';
import { Payment } from '../src/models/Payment';
import { Order } from '../src/models/Order';
import { Refund } from '../src/models/Refund';
import { CouponRedemption } from '../src/models/CouponRedemption';
import { PaymentProviderEvent } from '../src/models/PaymentProviderEvent';
import { NotificationDelivery } from '../src/models/NotificationDelivery';
import { IdempotencyRecord } from '../src/models/IdempotencyRecord';
import { SchedulerLock } from '../src/models/SchedulerLock';

const app = createApp();

describe('MongoDB production readiness', () => {
  it('sanitizeMongoUri never exposes credentials', () => {
    const raw =
      'mongodb+srv://luxora_user:s3cretPass@cluster0.example.net/luxora?retryWrites=true';
    const safe = sanitizeMongoUri(raw);
    expect(safe).not.toContain('s3cretPass');
    expect(safe).toContain('***');
    expect(safe).toContain('cluster0.example.net');
  });

  it('connect options include pool and timeout settings', () => {
    const opts = buildMongoConnectOptions();
    expect(opts.maxPoolSize).toBe(env.MONGODB_MAX_POOL_SIZE);
    expect(opts.serverSelectionTimeoutMS).toBe(
      env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    );
    expect(opts.connectTimeoutMS).toBe(env.MONGODB_CONNECT_TIMEOUT_MS);
    expect(opts.socketTimeoutMS).toBe(env.MONGODB_SOCKET_TIMEOUT_MS);
    expect(opts.heartbeatFrequencyMS).toBe(env.MONGODB_HEARTBEAT_FREQUENCY_MS);
  });

  it('duplicate connectDB is safe (shared connection)', async () => {
    const a = await connectDB();
    const b = await connectDB();
    expect(a.connection.readyState).toBe(1);
    expect(b.connection.readyState).toBe(1);
    expect(isDbReady()).toBe(true);
  });

  it('LIVE is 200 even when we only check process health', async () => {
    const live = await request(app).get('/api/v1/health/live');
    expect(live.status).toBe(200);
    expect(live.body.status).toBe('ok');
  });

  it('READY is 200 with ping when Mongo is connected', async () => {
    const ready = await request(app).get('/api/v1/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.status).toBe('ready');
    expect(ready.body.db).toBe('connected');
    expect(ready.body.dbPing?.ok).toBe(true);
  });

  it('READY fails after disconnect; LIVE stays ok; reconnect restores READY', async () => {
    await disconnectDB();
    resetDbListenerGuardForTests();
    expect(getDbState()).toBe('disconnected');

    const notReady = await request(app).get('/api/v1/health/ready');
    expect(notReady.status).toBe(503);
    expect(notReady.body.status).toBe('not_ready');

    const live = await request(app).get('/api/v1/health/live');
    expect(live.status).toBe(200);

    const check = await checkDbReady();
    expect(check.ready).toBe(false);

    // Commerce mutations must not silently succeed against a down DB.
    const boom = await request(app).post('/api/v1/auth/register').send({
      firstName: 'تست',
      lastName: 'مانگو',
      phone: `0912${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`,
      email: `mongo-down-${Math.random().toString(36).slice(2)}@luxora.ir`,
      password: 'demo1234a',
    });
    expect(boom.status).toBeGreaterThanOrEqual(500);

    await connectDB(process.env.MONGODB_URI);
    const readyAgain = await request(app).get('/api/v1/health/ready');
    expect(readyAgain.status).toBe(200);
    expect(readyAgain.body.status).toBe('ready');
  });

  it('ensureIndexes is create-only; syncIndexes forbidden outside test helper', async () => {
    const result = await ensureIndexes({ mode: 'create' });
    expect(result.models).toBeGreaterThan(5);
    await expect(ensureIndexes({ mode: 'drop' as 'create' })).rejects.toThrow(
      /Destructive/,
    );
    // Helper is allowed in test
    await syncIndexesForTestsOnly();
  });

  it('required integrity indexes exist after ensureIndexes', async () => {
    await ensureIndexes({ mode: 'create' });

    async function indexKeys(model: mongoose.Model<unknown>) {
      const indexes = await model.collection.indexes();
      return indexes.map((idx) => JSON.stringify(idx.key));
    }

    const paymentIdx = await indexKeys(Payment as mongoose.Model<unknown>);
    expect(paymentIdx.some((k) => k.includes('"authority"'))).toBe(true);
    expect(
      paymentIdx.some((k) => k === JSON.stringify({ orderNumber: 1 })),
    ).toBe(true);

    const orderIdx = await indexKeys(Order as mongoose.Model<unknown>);
    expect(orderIdx.some((k) => k.includes('"orderNumber"'))).toBe(true);

    const refundIdx = await indexKeys(Refund as mongoose.Model<unknown>);
    expect(
      refundIdx.some((k) => k === JSON.stringify({ idempotencyKey: 1 })),
    ).toBe(true);

    const couponIdx = await indexKeys(
      CouponRedemption as mongoose.Model<unknown>,
    );
    expect(couponIdx.some((k) => k.includes('"order"'))).toBe(true);

    const eventIdx = await indexKeys(
      PaymentProviderEvent as mongoose.Model<unknown>,
    );
    expect(eventIdx.some((k) => k.includes('"eventId"'))).toBe(true);
    expect(eventIdx.some((k) => k.includes('"payment"'))).toBe(true);

    const notifIdx = await indexKeys(
      NotificationDelivery as mongoose.Model<unknown>,
    );
    expect(notifIdx.some((k) => k.includes('"deliveryKey"'))).toBe(true);

    const idempIdx = await indexKeys(
      IdempotencyRecord as mongoose.Model<unknown>,
    );
    expect(idempIdx.some((k) => k.includes('"key"'))).toBe(true);

    const lockIdx = await indexKeys(SchedulerLock as mongoose.Model<unknown>);
    expect(lockIdx.some((k) => k.includes('"name"'))).toBe(true);
  });

  it('MongoServerSelection against bad URI fails deterministically', async () => {
    await disconnectDB();
    resetDbListenerGuardForTests();
    await expect(
      connectDB('mongodb://127.0.0.1:1/nope?serverSelectionTimeoutMS=500'),
    ).rejects.toBeTruthy();
    // Restore suite DB for subsequent tests / afterAll
    await connectDB(process.env.MONGODB_URI);
  });
});
