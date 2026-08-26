/**
 * Mobile cart + profile polish QA.
 * Usage: node scripts/mobile-cart-profile-qa.mjs
 * Expects vite preview at BASE_URL (default http://127.0.0.1:4173)
 */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const DEMO_PHONE = '09121234567';
const DEMO_PASSWORD = 'demo1234';

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
  await page.waitForTimeout(200);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('dialog', async (d) => {
  throw new Error('Unexpected dialog: ' + d.message());
});

// —— Empty cart ——
await page.goto(BASE + '/cart', { waitUntil: 'domcontentloaded' });
await page.getByText('سبد خرید شما خالی است').waitFor();
await page.getByRole('link', { name: /مشاهده فروشگاه/ }).waitFor();
await noHorizontalOverflow(page, 'empty cart @390');
console.log('PASS empty cart');

// —— Seed + cart with item ——
await seedCart(page);
await page.goto(BASE + '/cart', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /سبد خرید/ }).waitFor();

// Header offset: title should not sit under fixed header
const titleBox = await page.getByRole('heading', { level: 1 }).boundingBox();
assert.ok(titleBox && titleBox.y >= 56, `title under header: y=${titleBox?.y}`);

// Sticky CTA present with unified copy
const sticky = page.locator('[aria-label="خلاصه پرداخت"]');
await sticky.waitFor({ state: 'visible' });
const stickyText = await sticky.innerText();
assert.ok(
  stickyText.includes('ثبت و پرداخت سفارش'),
  'sticky CTA should use checkout copy',
);

// Free shipping messaging (single item below threshold)
const body = await page.locator('body').innerText();
assert.ok(body.includes('تا ارسال رایگان') || body.includes('ارسال رایگان'), 'shipping copy');
assert.equal(body.includes('هدیه ویژه'), false, 'old gift copy should be gone');

// Quantity + touch targets
const qtyPlus = page.getByRole('button', { name: /افزایش|Increase|\+/ }).first();
const qtyButtons = page.locator('button').filter({ hasText: /^\s*$/ });
// Prefer aria-labels from CartItem
const plusBtn = page.locator('[aria-label*="افزایش"], [aria-label*="plus"]').first();
const minusBtn = page.locator('[aria-label*="کاهش"], [aria-label*="minus"]').first();
const removeBtn = page.locator('[aria-label*="حذف"]').first();

async function assertMinTouch(locator, label) {
  if ((await locator.count()) === 0) return;
  const box = await locator.boundingBox();
  assert.ok(box, `${label} missing box`);
  assert.ok(box.width >= 40 && box.height >= 40, `${label} touch ${box.width}x${box.height}`);
}

await assertMinTouch(plusBtn, 'qty+');
await assertMinTouch(minusBtn, 'qty-');
await assertMinTouch(removeBtn, 'remove');

const totalBefore = await sticky.locator('strong').innerText();
if ((await plusBtn.count()) > 0) {
  await plusBtn.click();
  await page.waitForTimeout(150);
  const totalAfter = await sticky.locator('strong').innerText();
  assert.notEqual(totalAfter, totalBefore, 'qty+ should update sticky total');
}

// Form labels focus fields
const firstNameLabel = page.locator('label[for="checkout-first-name"]');
await firstNameLabel.click();
const focused = await page.evaluate(() => document.activeElement?.id);
assert.equal(focused, 'checkout-first-name', 'label should focus input');

// Checkout validation
await sticky.getByRole('button', { name: /ثبت و پرداخت/ }).click();
await page.getByRole('alert').first().waitFor({ state: 'visible' });

console.log('PASS cart item / sticky / form / validation');

// —— Overflow viewports ——
for (const width of [320, 360, 390, 430]) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(BASE + '/cart', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1 }).waitFor();
  await noHorizontalOverflow(page, `cart @${width}`);
  const stickyVisible = await page
    .locator('[aria-label="خلاصه پرداخت"]')
    .evaluate((el) => getComputedStyle(el).display !== 'none');
  assert.equal(stickyVisible, true, `sticky visible @${width}`);
}
console.log('PASS cart mobile overflow + sticky');

// —— Desktop cart regression ——
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(BASE + '/cart', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { level: 1 }).waitFor();
const stickyDesktop = await page
  .locator('[aria-label="خلاصه پرداخت"]')
  .evaluate((el) => getComputedStyle(el).display === 'none');
assert.equal(stickyDesktop, true, 'sticky hidden on desktop');
await noHorizontalOverflow(page, 'cart @1280');
console.log('PASS desktop cart');

// —— Profile logged out ——
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /ورود به حساب/ }).waitFor();
const profileTitle = await page.getByRole('heading', { level: 1 }).boundingBox();
assert.ok(
  profileTitle && profileTitle.y >= 56,
  `profile title under header: y=${profileTitle?.y}`,
);
await noHorizontalOverflow(page, 'profile login @390');

// Demo login
await page.locator('#profile-identifier, input[name="identifier"], input[type="tel"], input[autocomplete="username"]').first().fill(DEMO_PHONE);
await page.locator('input[type="password"]').first().fill(DEMO_PASSWORD);
await page.getByRole('button', { name: /ورود/ }).click();
await page.getByText('حساب کاربری').first().waitFor({ timeout: 8000 });
await page.getByRole('navigation', { name: /بخش‌های حساب/ }).waitFor();
await noHorizontalOverflow(page, 'profile account @390');

// Shortcuts
await page.getByRole('link', { name: /علاقه‌مندی/ }).first().click();
await page.waitForURL('**/wishlist');
await page.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' });
await page.getByText('حساب کاربری').first().waitFor();
await page.getByRole('link', { name: /سبد خرید/ }).first().click();
await page.waitForURL('**/cart');

// Logout
await page.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' });
await page.getByText('حساب کاربری').first().waitFor();
await page.getByRole('button', { name: /خروج از حساب|^خروج$/ }).click();
await page.getByRole('heading', { name: /ورود به حساب/ }).waitFor();
console.log('PASS profile login / nav / logout');

for (const width of [320, 360, 430, 1024, 1440]) {
  await page.setViewportSize({
    width,
    height: width >= 1024 ? 900 : 800,
  });
  await page.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1 }).waitFor();
  await noHorizontalOverflow(page, `profile @${width}`);
}
console.log('PASS profile overflow matrix');

assert.equal(
  consoleErrors.length,
  0,
  'console errors: ' + consoleErrors.join('; '),
);

console.log('MOBILE CART PROFILE QA PASSED');
await browser.close();
