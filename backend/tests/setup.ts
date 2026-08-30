import { afterAll, beforeAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import {
  connectDB,
  disconnectDB,
  syncIndexesForTestsOnly,
} from '../src/config/db';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB(mongo.getUri());
  // Test-only: align indexes with schema (may drop extras). Forbidden in production.
  await syncIndexesForTestsOnly();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await disconnectDB();
  if (mongo) await mongo.stop();
});
