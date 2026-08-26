/**
 * Phase 2 refinement regression + Phase 1 trust smoke.
 * node scripts/phase2-qa.mjs
 */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';

// —— Unit: gallery normalizer ——
function normalize(product) {
  const seen = new Set();
  const result = [];
  const push = (url, alt, isPrimary) => {
    const t = String(url || '').trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    result.push({ url: t, alt, isPrimary });
  };
  if (product.images?.length) {
    for (const image of product.images) push(image.url, image.alt || product.name, !!image.isPrimary);
  } else {
    if (product.imageSrc) push(product.imageSrc, product.imageAlt || product.name, true);
    for (const entry of product.gallery || []) push(entry, product.imageAlt || product.name, false);
  }
  return result;
}

assert.equal(
  normalize({ name: 'a', imageSrc: '/a.webp', gallery: ['/a.webp', '/a.webp', '/b.webp'] }).length,
  2,
);
assert.equal(normalize({ name: 'a', imageSrc: '/a.webp' }).length, 1);
assert.equal(
  normalize({
    name: 'a',
    images: [
      { url: '/a.webp', isPrimary: true },
      { url: '/a.webp', isPrimary: false },
      { url: '/b.webp', isPrimary: false },
    ],
  }).length,
  2,
);
console.log('PASS unit: gallery dedupe');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('dialog', async (d) => {
  throw new Error('Unexpected dialog: ' + d.message());
});

// Gallery: one real image, no thumbs
await page.goto(BASE + '/product/silk-blend-blouse', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { level: 1 }).waitFor();
const mainImg = page.locator('img[class*="mainImage"]');
await mainImg.waitFor({ state: 'visible' });
const mainSrc = await mainImg.getAttribute('src');
const thumbCount = await page.locator('[role="tablist"] button').count();
const bodyText = await page.locator('body').innerText();
assert.equal(thumbCount, 0, 'single-image should have no thumbs');
assert.ok(mainSrc && mainSrc.length > 0, `main image missing: ${mainSrc}`);
assert.equal(bodyText.includes('★★★★★'), false, 'fake stars still present');
assert.equal(
  bodyText.includes('هنوز نظری برای این محصول ثبت نشده است'),
  true,
  'empty review state missing',
);
console.log('PASS gallery single-image + honest reviews');

// Size guide open/close/escape/body lock
await page.locator('button', { hasText: 'راهنمای سایز' }).click();
await page.waitForTimeout(250);
const sizeDialog = page.locator('[role="dialog"][aria-modal="true"]').filter({
  has: page.getByRole('heading', { name: 'راهنمای سایز' }),
});
assert.ok(await sizeDialog.isVisible(), 'size guide dialog not open');
const locked = await page.evaluate(() => document.body.style.overflow === 'hidden');
assert.equal(locked, true, 'body scroll not locked');
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
assert.equal(await sizeDialog.count(), 0, 'size guide still in DOM after Escape');
const unlocked = await page.evaluate(() => document.body.style.overflow !== 'hidden');
assert.equal(unlocked, true, 'body scroll not restored');
console.log('PASS size guide open/escape/scroll lock');

// Newsletter validation + success
await page.goto(BASE + '/');
await page.locator('#footer-email').fill('');
await page.locator('footer button[type="submit"]').click();
await page.waitForTimeout(200);
// empty may be caught by validate
let feedback = await page.locator('#footer-email').evaluate((el) => {
  const id = el.getAttribute('aria-describedby');
  return id ? document.getElementById(id)?.textContent : null;
});
if (!feedback) {
  // try submit with spaces
  await page.locator('#footer-email').fill('   ');
  await page.locator('footer button[type="submit"]').click();
  await page.waitForTimeout(200);
  feedback = await page.locator('[role="alert"], [role="status"]').last().textContent();
}
assert.ok(
  feedback && feedback.includes('ایمیل'),
  `empty validation missing: ${feedback}`,
);
await page.locator('#footer-email').fill('not-an-email');
await page.locator('footer button[type="submit"]').click();
await page.waitForTimeout(200);
const invalid = await page.locator('[role="alert"]').last().textContent();
assert.ok(invalid && invalid.includes('معتبر'), `invalid msg: ${invalid}`);
await page.locator('#footer-email').fill('guest@luxora.test');
await page.locator('footer button[type="submit"]').click();
await page.waitForTimeout(700);
const success = await page.locator('[role="status"]').filter({ hasText: 'ثبت شد' }).textContent();
assert.ok(success && success.includes('ثبت شد'), `success missing: ${success}`);
assert.equal(await page.inputValue('#footer-email'), '');
console.log('PASS newsletter validation + success');

// Phase 1 smoke: free shipping + no alert ATC + wishlist
await page.goto(BASE + '/');
await page.evaluate(() => {
  localStorage.setItem(
    'luxora-cart',
    JSON.stringify({
      items: [
        {
          id: 'x',
          productId: 'p',
          name: 't',
          price: 5_000_000,
          currency: 'تومان',
          size: 'M',
          imageSrc: '',
          imageAlt: '',
          quantity: 1,
        },
      ],
    }),
  );
  localStorage.removeItem('luxora-wishlist');
});
await page.goto(BASE + '/cart');
await page.waitForTimeout(400);
const ship = await page.evaluate(() => {
  const row = [...document.querySelectorAll('[class*="priceRow"]')].find((r) =>
    r.innerText.includes('هزینه ارسال'),
  );
  return row?.innerText || '';
});
assert.ok(ship.includes('رایگان'), `free shipping broken: ${ship}`);

await page.goto(BASE + '/product/silk-blend-blouse');
await page.locator('button[aria-label="افزودن به علاقه‌مندی‌ها"]').click();
await page.waitForTimeout(200);
const wl = await page.evaluate(() => localStorage.getItem('luxora-wishlist'));
assert.ok(wl && wl.length > 5, 'wishlist persistence broken');
await page.locator('button').filter({ hasText: /افزودن به سبد خرید/ }).first().click();
await page.waitForTimeout(300);
assert.ok(await page.locator('[role="status"]', { hasText: 'سبد خرید' }).isVisible());
console.log('PASS phase1 smoke: shipping/wishlist/toast');

// Overflow checks
for (const w of [320, 360, 390, 430, 1280]) {
  await page.setViewportSize({ width: w, height: 844 });
  await page.goto(BASE + '/product/silk-blend-blouse');
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  assert.equal(overflow, false, `overflow @${w}`);
}
console.log('PASS no overflow on PDP @320–430,1280');

const serious = consoleErrors.filter(
  (t) => !t.includes('favicon') && !t.includes('Download the React DevTools'),
);
assert.equal(serious.length, 0, `console errors: ${serious.join(' | ')}`);
console.log('PASS no console errors');

await browser.close();
console.log('\nPHASE 2 QA PASSED');
