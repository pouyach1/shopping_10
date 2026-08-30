import { afterAll, beforeAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { connectDB, disconnectDB } from '../src/config/db';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB(mongo.getUri());
  // Ensure partial unique indexes (e.g. one open payment per order) exist.
  await mongoose.connection.syncIndexes();
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
