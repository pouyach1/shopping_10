import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 30_000,
    setupFiles: ['./tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-only-jwt-secret-do-not-use-elsewhere-32+',
      JWT_EXPIRES_IN: '1h',
      CLIENT_ORIGINS: 'http://localhost:5173',
    },
  },
});
