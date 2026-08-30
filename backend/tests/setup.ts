import { afterAll, beforeAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import {
  connectDB,
  disconnectDB,
  resetDbLifecycleForTests,
} from '../src/config/db';

let mongo: MongoMemoryServer | null = null;
let usingMemoryServer = false;

const LOCAL_TEST_URI =
  process.env.LUXORA_TEST_MONGO_URI ??
  'mongodb://127.0.0.1:27017/luxora_test';

/**
 * Prefer an already-running local Mongo (fast CI/dev) when reachable.
 * Fall back to MongoMemoryServer — first download can take several minutes.
 * Neither path proves Atlas / replica-set production cluster behavior.
 */
async function resolveTestUri(): Promise<string> {
  if (process.env.LUXORA_FORCE_MEMORY_MONGO === 'true') {
    mongo = await MongoMemoryServer.create();
    usingMemoryServer = true;
    return mongo.getUri();
  }

  try {
    await mongoose.connect(LOCAL_TEST_URI, {
      serverSelectionTimeoutMS: 2_000,
      connectTimeoutMS: 2_000,
    });
    await mongoose.disconnect();
    return LOCAL_TEST_URI;
  } catch {
    mongo = await MongoMemoryServer.create();
    usingMemoryServer = true;
    return mongo.getUri();
  }
}

beforeAll(async () => {
  const uri = await resolveTestUri();
  process.env.MONGODB_URI = uri;
  await connectDB(uri);
});

beforeEach(async () => {
  resetDbLifecycleForTests();
  if (mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI;
    if (uri) await connectDB(uri);
  }
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await disconnectDB();
  if (usingMemoryServer && mongo) {
    await mongo.stop();
  }
});
