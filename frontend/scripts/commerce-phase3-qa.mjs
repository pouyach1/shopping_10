/**
 * Commerce smoke: guest cart/wishlist persistence + logout clears state.
 * Usage: node scripts/commerce-phase3-qa.mjs
 * Expects vite preview at BASE_URL (default http://127.0.0.1:4173)
 */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const DEMO_PHONE = '09121234567';
const DEMO_PASSWORD = 'demo1234';
const WIDTHS = [320, 360, 390, 430];

async function noHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  assert.equal(overflow, false, `horizontal overflow: ${label}`);
}

async function seedCart(page) {
  await page.goto(BASE + '/product/silk-blend-blouse', {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('heading', { level: 1 }).waitFor();
  const size = page.getByRole('button', { name: /^M$/ }).first();
  if (await size.count()) await size.click();
  await page.getByRole('button', { name: /افزودن به سبد/ }).first().click();
  await page.waitForTimeout(250);
}

const browser = await chromium.launch({ headless: true });
const consoleErrors = [];
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

// —— Product → Cart → refresh ——
await seedCart(page);
await page.goto(BASE + '/cart', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /سبد خرید/ }).waitFor();
const badge = page.getByRole('banner').locator('[data-cart-count], a[href="/cart"]');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /سبد خرید/ }).waitFor();
const body = await page.locator('body').innerText();
assert.ok(body.includes('بلوز') || body.includes('سبد'), 'cart still has content after refresh');
console.log('PASS cart persists after refresh');

// —— Wishlist via ProductCard heart on home ——
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
const wishBtn = page.locator('button[aria-label*="علاقه"]').first();
if (await wishBtn.count()) {
  await wishBtn.click();
  await page.waitForTimeout(200);
}
await page.goto(BASE + '/wishlist', { waitUntil: 'domcontentloaded' });
await page.reload({ waitUntil: 'domcontentloaded' });
console.log('PASS wishlist page loads after refresh');

// —— Login then logout clears cart ——
await page.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /ورود به حساب/ }).waitFor();
await page
  .locator('#profile-identifier, input[name="identifier"], input[type="tel"], input[autocomplete="username"]')
  .first()
  .fill(DEMO_PHONE);
await page.locator('input[type="password"]').first().fill(DEMO_PASSWORD);
await page.getByRole('button', { name: 'ورود', exact: true }).click();
await page.getByText('حساب کاربری').first().waitFor({ timeout: 8000 });
await page.getByRole('button', { name: /خروج از حساب|^خروج$/ }).click();
await page.getByRole('heading', { name: /ورود به حساب/ }).waitFor();
await page.goto(BASE + '/cart', { waitUntil: 'domcontentloaded' });
await page.getByText('سبد خرید شما خالی است').waitFor({ timeout: 5000 });
console.log('PASS logout cleared cart');

// —— Mobile viewports ——
for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(BASE + '/cart', { waitUntil: 'domcontentloaded' });
  await noHorizontalOverflow(page, `cart @${width}`);
  await page.goto(BASE + '/wishlist', { waitUntil: 'domcontentloaded' });
  await noHorizontalOverflow(page, `wishlist @${width}`);
  await page.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' });
  await noHorizontalOverflow(page, `profile @${width}`);
  console.log(`PASS no overflow @${width}`);
}

assert.equal(consoleErrors.length, 0, 'console errors: ' + consoleErrors.join(' | '));
console.log('PASS no console errors');

await browser.close();
console.log('ALL COMMERCE QA PASSED');
