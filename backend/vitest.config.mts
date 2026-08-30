import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    // First-run MongoMemoryServer binary download can exceed 2 minutes on slow links.
    hookTimeout: 600_000,
    testTimeout: 60_000,
    setupFiles: ['./tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-only-jwt-secret-do-not-use-elsewhere-32+',
      JWT_EXPIRES_IN: '1h',
      CLIENT_ORIGINS: 'http://localhost:5173',
      // Prefer local mongod when present; set LUXORA_FORCE_MEMORY_MONGO=true to use Memory Server.
      LUXORA_TEST_MONGO_URI: 'mongodb://127.0.0.1:27017/luxora_test',
    },
  },
});
