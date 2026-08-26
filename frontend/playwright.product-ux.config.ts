import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts',
  testMatch: 'product-ux.e2e.ts',
  timeout: 90_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174',
    locale: 'fa-IR',
    viewport: { width: 1280, height: 900 },
  },
  reporter: [['list']],
});
