/**
 * Profile mobile polish QA.
 * Usage: node scripts/profile-mobile-qa.mjs
 */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const DEMO_PHONE = '09121234567';
const DEMO_PASSWORD = 'demo1234';

async function noOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      bad: doc.scrollWidth > doc.clientWidth + 1,
      scrollW: doc.scrollWidth,
      clientW: doc.clientWidth,
    };
  });
  assert.equal(
    overflow.bad,
    false,
    `overflow ${label}: ${overflow.scrollW} > ${overflow.clientW}`,
  );
}

async function profileOffenders(page, width) {
  return page.evaluate((w) => {
    const main = document.querySelector('#main-content');
    if (!main) return [];
    const bad = [];
    for (const el of main.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      // Ignore fixed header descendants outside main
      if (r.right > w + 2 || r.left < -2) {
        bad.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className || '').slice(0, 60),
          left: Math.round(r.left),
          right: Math.round(r.right),
        });
        if (bad.length > 8) break;
      }
    }
    return bad;
  }, width);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

// Logged out
await page.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /ورود به حساب/ }).waitFor();
const loginTitle = await page.getByRole('heading', { level: 1 }).boundingBox();
assert.ok(loginTitle && loginTitle.y >= 56, `login under header y=${loginTitle?.y}`);
await noOverflow(page, 'login@390');
console.log('PASS logged-out login shell');

// Login
await page.locator('input[name="identifier"]').fill(DEMO_PHONE);
await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
await page.getByRole('button', { name: /^ورود$/ }).click();
await page.getByRole('heading', { name: 'سارا محمدی' }).waitFor({ timeout: 8000 });
await page.getByRole('navigation', { name: /بخش‌های حساب/ }).waitFor();

// Identity + list nav present
assert.ok(await page.getByText('حساب فعال').count());
const nav = page.getByRole('navigation', { name: /بخش‌های حساب/ });
assert.equal(await nav.getByRole('button', { name: /نمای کلی/ }).count(), 1);
assert.equal(await nav.getByRole('button', { name: /سفارش‌های من/ }).count(), 1);
assert.equal(await nav.getByRole('button', { name: /اطلاعات حساب/ }).count(), 1);
assert.equal(await nav.getByRole('link', { name: /علاقه‌مندی‌ها/ }).count(), 1);
assert.equal(await nav.getByRole('link', { name: /سبد خرید/ }).count(), 1);

// Logout is secondary, not inside icon-grid as a tile twin
const logout = page.getByRole('button', { name: /خروج از حساب/ });
assert.equal(await logout.count(), 1);
const logoutBox = await logout.boundingBox();
assert.ok(logoutBox && logoutBox.height >= 44, 'logout touch target');

// Nav rows touch targets
for (const name of [/نمای کلی/, /سفارش‌های من/, /اطلاعات حساب/]) {
  const box = await nav.getByRole('button', { name }).boundingBox();
  assert.ok(box && box.height >= 56, `nav row short: ${name}`);
}

// Section switching
await nav.getByRole('button', { name: /سفارش‌های من/ }).click();
await page.getByRole('heading', { name: 'سفارش‌های من' }).waitFor();
await nav.getByRole('button', { name: /اطلاعات حساب/ }).click();
await page.getByRole('heading', { name: 'اطلاعات حساب' }).waitFor();
await nav.getByRole('button', { name: /نمای کلی/ }).click();
await page.getByRole('heading', { name: 'نمای کلی حساب' }).waitFor();

// Real routes
await nav.getByRole('link', { name: /علاقه‌مندی‌ها/ }).click();
await page.waitForURL('**/wishlist');
await page.goto(BASE + '/profile');
await page.getByRole('heading', { name: 'سارا محمدی' }).waitFor();
await page.getByRole('navigation', { name: /بخش‌های حساب/ }).getByRole('link', { name: /سبد خرید/ }).click();
await page.waitForURL('**/cart');

// Back to profile + logout
await page.goto(BASE + '/profile');
await page.getByRole('heading', { name: 'سارا محمدی' }).waitFor();
await page.getByRole('button', { name: /خروج از حساب/ }).click();
await page.getByRole('heading', { name: /ورود به حساب/ }).waitFor();
console.log('PASS logged-in nav / routes / logout');

// Viewport matrix
for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
  await page.setViewportSize({
    width,
    height: width >= 1024 ? 900 : 844,
  });
  await page.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1 }).waitFor();
  await noOverflow(page, `logged-out@${width}`);
  const offendersOut = await profileOffenders(page, width);
  assert.equal(
    offendersOut.length,
    0,
    `main offenders logged-out@${width}: ${JSON.stringify(offendersOut)}`,
  );

  await page.locator('input[name="identifier"]').fill(DEMO_PHONE);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /^ورود$/ }).click();
  await page.getByRole('heading', { name: 'سارا محمدی' }).waitFor({ timeout: 8000 });
  await noOverflow(page, `logged-in@${width}`);
  const offendersIn = await profileOffenders(page, width);
  assert.equal(
    offendersIn.length,
    0,
    `main offenders logged-in@${width}: ${JSON.stringify(offendersIn)}`,
  );
  await page.getByRole('button', { name: /خروج از حساب/ }).click();
  await page.getByRole('heading', { name: /ورود به حساب/ }).waitFor();
}
console.log('PASS viewport matrix 320–1440');

assert.equal(consoleErrors.length, 0, consoleErrors.join('; '));
console.log('PROFILE MOBILE QA PASSED');
await browser.close();
