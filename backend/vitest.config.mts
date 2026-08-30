import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 600_000,
    testTimeout: 60_000,
    setupFiles: ['./tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-only-jwt-secret-do-not-use-elsewhere-32+',
      JWT_EXPIRES_IN: '1h',
      CLIENT_ORIGINS: 'http://localhost:5173',
      DEFAULT_STORE_SLUG: 'luxora',
      LUXORA_TEST_MONGO_URI: 'mongodb://127.0.0.1:27017/luxora_tenant_test',
    },
  },
});
