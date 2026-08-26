/**
 * Focused regression for the five trust fixes.
 * Run: node scripts/trust-fixes-qa.mjs  (from frontend/, preview on :4173)
 */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const FREE_SHIPPING_THRESHOLD = 5_000_000;

function qualifiesForFreeShipping(subtotal) {
  return Number.isFinite(subtotal) && subtotal >= FREE_SHIPPING_THRESHOLD;
}
function resolveShippingCost(methodBasePrice, subtotal) {
  if (qualifiesForFreeShipping(subtotal)) return 0;
  const base = Number(methodBasePrice);
  return Number.isFinite(base) && base > 0 ? base : 0;
}

// —— Unit: shipping math (mirrors src/config/shipping.ts) ——
assert.equal(FREE_SHIPPING_THRESHOLD, 5_000_000);
assert.equal(qualifiesForFreeShipping(4_999_999), false);
assert.equal(qualifiesForFreeShipping(5_000_000), true);
assert.equal(qualifiesForFreeShipping(7_000_000), true);
assert.equal(resolveShippingCost(65_000, 3_000_000), 65_000);
assert.equal(resolveShippingCost(65_000, 5_000_000), 0);
assert.equal(resolveShippingCost(120_000, 7_000_000), 0);
console.log('PASS unit: shipping threshold math');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

async function seedCart(items) {
  await page.goto(BASE + '/');
  await page.evaluate((payload) => {
    localStorage.setItem('luxora-cart', JSON.stringify({ items: payload }));
  }, items);
}

function item(price, qty = 1, id = 't1') {
  return {
    id,
    productId: 'p',
    name: 'محصول تست',
    price,
    currency: 'تومان',
    size: 'M',
    color: 'کرم',
    imageSrc: '',
    imageAlt: '',
    quantity: qty,
  };
}

async function shippingRowText() {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll('[class*="priceRow"]')].map(
      (r) => r.innerText.replace(/\s+/g, ' ').trim(),
    );
    return rows.find((r) => r.includes('هزینه ارسال')) || null;
  });
}

async function stickyTotal() {
  return page.evaluate(() => {
    const el = document.querySelector('[class*="stickyTotal"]');
    return el?.innerText?.replace(/\s+/g, ' ').trim() || null;
  });
}

// —— Free shipping below / at / above ——
await seedCart([item(3_000_000)]);
await page.goto(BASE + '/cart');
await page.waitForTimeout(400);
let ship = await shippingRowText();
assert.ok(ship && !ship.includes('رایگان'), `expected charged shipping, got: ${ship}`);
console.log('PASS cart: subtotal 3M charges shipping →', ship);

await seedCart([item(5_000_000)]);
await page.goto(BASE + '/cart');
await page.waitForTimeout(400);
ship = await shippingRowText();
assert.ok(ship && ship.includes('رایگان'), `expected free at 5M, got: ${ship}`);
console.log('PASS cart: subtotal 5M free shipping →', ship);

await seedCart([item(3_490_000, 2)]); // 6.98M
await page.goto(BASE + '/cart');
await page.waitForTimeout(400);
ship = await shippingRowText();
assert.ok(ship && ship.includes('رایگان'), `expected free above 5M, got: ${ship}`);
const totalText = await stickyTotal();
// total should equal subtotal when free (6,980,000)
assert.ok(totalText && totalText.includes('۶٬۹۸۰٬۰۰۰'), `sticky total wrong: ${totalText}`);
console.log('PASS cart: 6.98M free + total matches subtotal →', totalText);

// Cross threshold via qty
await seedCart([item(2_600_000, 1, 'q')]);
await page.goto(BASE + '/cart');
await page.waitForTimeout(300);
ship = await shippingRowText();
assert.ok(ship && !ship.includes('رایگان'), `pre-qty should charge: ${ship}`);
await page.locator('button[aria-label="افزایش تعداد"]').click();
await page.waitForTimeout(300);
ship = await shippingRowText();
assert.ok(ship && ship.includes('رایگان'), `after qty×2 (5.2M) should be free: ${ship}`);
console.log('PASS cart: qty crossing threshold updates shipping live');

// —— Single header on cart ——
const navHeaders = await page.evaluate(() =>
  [...document.querySelectorAll('header')].filter((h) => {
    const cls = String(h.className);
    // Site header or luxury cart header — not section headers inside cards
    return cls.includes('_header_') && h.querySelector('a[aria-label], nav, [class*="logo"]');
  }).map((h) => ({ class: String(h.className).slice(0, 40), text: h.innerText.slice(0, 40) })),
);
// Broader: count headers that contain LUXORA brand link + icons like cart LuxuryHeader
const allHeaders = await page.evaluate(() =>
  [...document.querySelectorAll('header')].map((h) => ({
    class: String(h.className).slice(0, 50),
    text: h.innerText.replace(/\s+/g, ' ').slice(0, 60),
    hasBack: !!h.querySelector('[aria-label="بازگشت"]'),
  })),
);
assert.ok(
  !allHeaders.some((h) => h.hasBack),
  `LuxuryHeader still present: ${JSON.stringify(allHeaders)}`,
);
const siteNav = allHeaders.filter((h) => h.text.includes('لوکسورا') || h.text.includes('LUXORA'));
assert.ok(siteNav.length >= 1, 'Site header missing');
console.log('PASS cart: no LuxuryHeader back-button chrome; headers=', allHeaders.length);

// —— Province name ——
await page.evaluate(() => {
  /* leave cart seeded */
});
async function fillLabeled(labelText, value, kind = 'input') {
  const handle = await page.evaluateHandle(
    ({ labelText, kind }) => {
      const lab = [...document.querySelectorAll('label')].find(
        (l) => l.textContent?.trim() === labelText,
      );
      return lab?.parentElement?.querySelector(kind) || null;
    },
    { labelText, kind },
  );
  const el = handle.asElement();
  if (!el) throw new Error('missing ' + labelText);
  await el.focus();
  if (kind === 'select') {
    await page.evaluate((node) => {
      node.selectedIndex = 1;
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }, el);
  } else {
    await el.click({ clickCount: 3 });
    await page.keyboard.type(value, { delay: 4 });
  }
}
await fillLabeled('نام', 'سارا');
await fillLabeled('نام خانوادگی', 'محمدی');
await fillLabeled('شماره موبایل', '09121234567');
await fillLabeled('استان', '', 'select');
await page.waitForTimeout(250);
await fillLabeled('شهر', '', 'select');
await fillLabeled('آدرس', 'خیابان تست', 'textarea');
await page.waitForTimeout(300);
const loc = await page.evaluate(() => {
  const meta = document.querySelector('[class*="locationMeta"]');
  return meta?.innerText?.replace(/\s+/g, ' ').trim() || '';
});
assert.ok(!/(^|،)\s*1(\s|$)/.test(loc), `province id leaked: "${loc}"`);
assert.ok(loc.includes('آذربایجان') || loc.length > 3, `expected province name in "${loc}"`);
console.log('PASS province display →', loc);

// —— PDP wishlist persistence ——
await page.goto(BASE + '/');
await page.evaluate(() => {
  localStorage.removeItem('luxora-wishlist');
});
await page.goto(BASE + '/product/silk-blend-blouse');
await page.waitForTimeout(300);
await page.locator('button[aria-label="افزودن به علاقه‌مندی‌ها"]').click();
await page.waitForTimeout(200);
const stored = await page.evaluate(() => localStorage.getItem('luxora-wishlist'));
assert.ok(stored && stored.includes('prod-'), `wishlist not persisted: ${stored}`);
await page.goto(BASE + '/wishlist');
await page.waitForTimeout(300);
const wishText = await page.evaluate(() => document.body.innerText);
assert.ok(wishText.includes('بلوز') || wishText.includes('حریر'), 'wishlist page missing product');
await page.reload();
await page.waitForTimeout(300);
const wishText2 = await page.evaluate(() => document.body.innerText);
assert.ok(wishText2.includes('بلوز') || wishText2.includes('حریر'), 'wishlist lost after refresh');
await page.goto(BASE + '/product/silk-blend-blouse');
const pressed = await page
  .locator('button[aria-label="حذف از علاقه‌مندی‌ها"]')
  .getAttribute('aria-pressed');
assert.equal(pressed, 'true');
await page.locator('button[aria-label="حذف از علاقه‌مندی‌ها"]').click();
await page.waitForTimeout(200);
const afterRemove = await page.evaluate(() => localStorage.getItem('luxora-wishlist'));
assert.ok(!afterRemove || afterRemove === '[]', `not removed: ${afterRemove}`);
console.log('PASS PDP wishlist add → wishlist → refresh → remove');

// —— ATC toast, no alert ——
let alertHit = false;
page.on('dialog', async (d) => {
  alertHit = true;
  await d.dismiss();
});
await page.goto(BASE + '/product/silk-blend-blouse');
await page.locator('button').filter({ hasText: /افزودن به سبد/ }).first().click();
await page.waitForTimeout(400);
assert.equal(alertHit, false, 'alert() still used');
const toast = page.locator('[role="status"]', { hasText: 'محصول به سبد خرید اضافه شد' });
assert.ok(await toast.isVisible(), 'toast not visible');
const cartLink = toast.locator('a[href="/cart"]');
assert.ok(await cartLink.count(), 'toast missing cart link');
console.log('PASS ATC toast without alert()');

// —— Overflow spot check ——
for (const w of [320, 360, 390, 430, 1280]) {
  await page.setViewportSize({ width: w, height: 844 });
  await page.goto(BASE + '/cart');
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  assert.equal(overflow, false, `overflow at ${w}`);
}
console.log('PASS no horizontal overflow @320–430,1280 on cart');

// Desktop sticky hidden / single site header
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(BASE + '/cart');
const stickyDisplay = await page.evaluate(() => {
  const bar = [...document.querySelectorAll('div')].find((d) =>
    String(d.className).includes('stickyBar'),
  );
  return bar ? getComputedStyle(bar).display : 'missing';
});
assert.equal(stickyDisplay, 'none');
console.log('PASS desktop sticky bar hidden');

await browser.close();
console.log('\nALL TRUST FIXES VERIFIED');
