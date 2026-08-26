import { chromium } from '@playwright/test';
import path from 'node:path';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174';
const ARTIFACTS = '/opt/cursor/artifacts';
const UPLOAD = path.join(ARTIFACTS, 'test-product-upload.png');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: 'fa-IR',
  recordVideo: { dir: ARTIFACTS, size: { width: 1280, height: 900 } },
});
const page = await context.newPage();

await page.goto(`${BASE}/admin/login`);
await page.evaluate(() => {
  localStorage.removeItem('luxora-admin-data');
  localStorage.setItem('luxora-admin-authenticated', 'true');
});
await page.goto(`${BASE}/admin/products/prod-luna-bag`);
await page.waitForSelector('text=ویرایش محصول');
await page.waitForTimeout(800);

const name = page.locator('label').filter({ hasText: 'نام محصول' }).locator('input');
await name.fill('کیف دستی چرم لونا — تست');
await page.locator('label').filter({ hasText: 'قیمت فروش' }).locator('input').fill('4690000');
await page.getByRole('button', { name: 'M', exact: true }).click();
await page.getByRole('button', { name: /افزودن رنگ/ }).click();
await page.getByPlaceholder('نام رنگ (مثلاً مشکی)').last().fill('کرم');
await page.locator('input[type="color"]').last().fill('#E8D5B7');
await page.locator('input[type="file"]').setInputFiles(UPLOAD);
await page.waitForTimeout(1000);
await page.locator('ul[aria-label="تصاویر محصول"] li').nth(1)
  .getByRole('button', { name: 'تنظیم به‌عنوان تصویر اصلی' }).click();
await page.waitForTimeout(400);
await page.getByTestId('admin-theme-toggle').click();
await page.waitForTimeout(500);
await page.getByTestId('admin-theme-toggle').click();
await page.getByRole('button', { name: 'ذخیره تغییرات' }).click();
await page.waitForURL(/\/admin\/products$/);
await page.waitForTimeout(1200);
await page.goto(`${BASE}/admin/products/prod-luna-bag`);
await page.waitForTimeout(1000);
await page.goto(`${BASE}/product/silk-blend-blouse`);
await page.waitForTimeout(1200);

await context.close();
await browser.close();
console.log('video recorded under', ARTIFACTS);
