/**
 * Profile account-hub QA.
 * Usage: node scripts/profile-mobile-qa.mjs
 */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const DEMO_PHONE = '09121234567';
const DEMO_PASSWORD = 'demo1234';

const WISHLIST_STORAGE_KEY = 'luxora-wishlist';
const CART_STORAGE_KEY = 'luxora-cart';

const seedWishlist = [
  {
    id: 'qa-wish-1',
    productId: 'prod-1',
    name: 'بلوز حریر',
    price: 1290000,
    currency: 'تومان',
    size: 'M',
    imageSrc: '/src/assets/images/products/silk-blouse.webp',
    imageAlt: 'بلوز حریر',
  },
  {
    id: 'qa-wish-2',
    productId: 'prod-2',
    name: 'پالتو پشمی',
    price: 3490000,
    currency: 'تومان',
    size: 'L',
    imageSrc: '/src/assets/images/products/wool-coat.webp',
    imageAlt: 'پالتو پشمی',
  },
];

const seedCart = {
  items: [
    {
      id: 'qa-cart-1',
      productId: 'prod-4',
      name: 'پلیور کشمیر',
      price: 1890000,
      currency: 'تومان',
      size: 'M',
      imageSrc: '/src/assets/images/products/cashmere-sweater.webp',
      imageAlt: 'پلیور کشمیر',
      quantity: 2,
    },
  ],
};

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

async function login(page) {
  await page.locator('input[name="identifier"]').fill(DEMO_PHONE);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /^ورود$/ }).click();
  await page.getByRole('heading', { name: 'پروفایل من' }).waitFor({ timeout: 8000 });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(
  ({ wishlistKey, cartKey, wishlist, cart }) => {
    localStorage.setItem(wishlistKey, JSON.stringify(wishlist));
    localStorage.setItem(cartKey, JSON.stringify(cart));
  },
  {
    wishlistKey: WISHLIST_STORAGE_KEY,
    cartKey: CART_STORAGE_KEY,
    wishlist: seedWishlist,
    cart: seedCart,
  },
);
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (error) => consoleErrors.push(error.message));

await page.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /ورود به حساب/ }).waitFor();
const loginTitle = await page.getByRole('heading', { level: 1 }).boundingBox();
assert.ok(loginTitle && loginTitle.y >= 56, `login under header y=${loginTitle?.y}`);
await noOverflow(page, 'login@390');
console.log('PASS logged-out login shell');

await login(page);
await page.getByRole('navigation', { name: /بخش‌های حساب/ }).waitFor();

const nav = page.getByRole('navigation', { name: /بخش‌های حساب/ });
assert.equal(await nav.getByRole('link', { name: /سفارش‌های من/ }).count(), 1);
assert.equal(await nav.getByRole('link', { name: /علاقه‌مندی‌ها/ }).count(), 1);
assert.equal(await nav.getByRole('link', { name: /سبد خرید/ }).count(), 1);
assert.equal(await nav.getByRole('link', { name: /اطلاعات حساب/ }).count(), 1);
assert.equal(await nav.getByRole('button', { name: /نمای کلی/ }).count(), 0);

assert.ok(await page.getByText('حساب فعال').count());
assert.ok(await page.getByText('سارا محمدی').count());

const logout = page.getByRole('button', { name: /خروج از حساب/ });
assert.equal(await logout.count(), 1);
const logoutBox = await logout.boundingBox();
assert.ok(logoutBox && logoutBox.height >= 44, 'logout touch target');

for (const name of [/سفارش‌های من/, /علاقه‌مندی‌ها/, /سبد خرید/, /اطلاعات حساب/]) {
  const box = await nav.getByRole('link', { name }).boundingBox();
  assert.ok(box && box.height >= 56, `nav row short: ${name}`);
}

assert.ok(await nav.getByText('۳').count(), 'orders count missing');
assert.ok(await nav.getByText('۲').count(), 'wishlist/cart count missing');

assert.equal(await page.getByRole('heading', { name: 'نمای کلی حساب' }).count(), 0);
assert.equal(await page.locator('#main-content').getByRole('heading', { name: 'سفارش‌های من' }).count(), 0);

await nav.getByRole('link', { name: /سفارش‌های من/ }).click();
await page.waitForURL('**/profile/orders');
await page.getByRole('heading', { name: 'سفارش‌های من' }).waitFor();
assert.equal(await nav.count(), 0, 'hub nav still visible on orders');
assert.ok(await page.getByText('#LX-10421').count());
await page.evaluate(() => window.scrollTo(0, 400));
await page.getByRole('button', { name: 'بازگشت به پروفایل' }).click();
await page.waitForURL((url) => url.pathname === '/profile');
await page.getByRole('navigation', { name: /بخش‌های حساب/ }).waitFor();
console.log('PASS orders section + back');

await nav.getByRole('link', { name: /علاقه‌مندی‌ها/ }).click();
await page.waitForURL('**/profile/wishlist');
await page.getByRole('heading', { name: 'علاقه‌مندی‌ها' }).waitFor();
assert.ok(await page.getByText('بلوز حریر').count());
await page.getByRole('button', { name: 'بازگشت به پروفایل' }).click();
await page.waitForURL((url) => url.pathname === '/profile');
console.log('PASS wishlist section + back');

await page.getByRole('navigation', { name: /بخش‌های حساب/ }).getByRole('link', { name: /سبد خرید/ }).click();
await page.waitForURL('**/profile/cart');
await page.getByRole('heading', { name: 'سبد خرید' }).waitFor();
assert.ok(await page.getByText('پلیور کشمیر').count());
await page.getByRole('link', { name: 'رفتن به سبد خرید' }).click();
await page.waitForURL('**/cart');
await page.goBack();
await page.waitForURL('**/profile/cart');
await page.getByRole('button', { name: 'بازگشت به پروفایل' }).click();
await page.waitForURL((url) => url.pathname === '/profile');
console.log('PASS cart section + shortcut + back');

await page.getByRole('navigation', { name: /بخش‌های حساب/ }).getByRole('link', { name: /اطلاعات حساب/ }).click();
await page.waitForURL('**/profile/account');
await page.getByRole('heading', { name: 'اطلاعات حساب' }).waitFor();
assert.ok(await page.getByText('customer@luxora.ir').count());
await page.goBack();
await page.waitForURL((url) => url.pathname === '/profile');
await page.getByRole('navigation', { name: /بخش‌های حساب/ }).waitFor();
await page.goForward();
await page.waitForURL('**/profile/account');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: 'اطلاعات حساب' }).waitFor();
console.log('PASS account + history + refresh');

await page.goto(BASE + '/profile');
await page.getByRole('navigation', { name: /بخش‌های حساب/ }).waitFor();
await page.getByRole('button', { name: 'باز کردن منو' }).click();
const drawer = page.getByRole('dialog', { name: 'LUXORA' });
await drawer.waitFor();
await drawer.getByRole('link', { name: 'حساب (سارا محمدی)' }).click();
await page.waitForURL((url) => url.pathname === '/profile');
assert.equal(await page.getByRole('dialog', { name: 'LUXORA' }).count(), 0);
console.log('PASS mobile nav drawer → profile');

await page.getByRole('button', { name: /خروج از حساب/ }).click();
await page.getByRole('heading', { name: /ورود به حساب/ }).waitFor();
console.log('PASS logout');

const viewports = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1024, height: 900 },
  { width: 1280, height: 900 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

for (const { width, height } of viewports) {
  await page.setViewportSize({ width, height });
  await page.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1 }).waitFor();
  await noOverflow(page, `logged-out@${width}`);
  const offendersOut = await profileOffenders(page, width);
  assert.equal(
    offendersOut.length,
    0,
    `main offenders logged-out@${width}: ${JSON.stringify(offendersOut)}`,
  );

  await login(page);
  await noOverflow(page, `hub@${width}`);
  const offendersHub = await profileOffenders(page, width);
  assert.equal(
    offendersHub.length,
    0,
    `main offenders hub@${width}: ${JSON.stringify(offendersHub)}`,
  );

  await page.getByRole('navigation', { name: /بخش‌های حساب/ }).getByRole('link', { name: /سفارش‌های من/ }).click();
  await page.getByRole('heading', { name: 'سفارش‌های من' }).waitFor();
  await noOverflow(page, `orders@${width}`);
  const offendersOrders = await profileOffenders(page, width);
  assert.equal(
    offendersOrders.length,
    0,
    `main offenders orders@${width}: ${JSON.stringify(offendersOrders)}`,
  );

  if (width < 1024) {
    await page.getByRole('button', { name: 'بازگشت به پروفایل' }).click();
  } else {
    await page.goto(BASE + '/profile');
  }
  await page.getByRole('navigation', { name: /بخش‌های حساب/ }).waitFor();
  await page.getByRole('button', { name: /خروج از حساب/ }).click();
  await page.getByRole('heading', { name: /ورود به حساب/ }).waitFor();
}
console.log('PASS viewport matrix 320–1920');

assert.equal(consoleErrors.length, 0, consoleErrors.join('; '));
console.log('PROFILE ACCOUNT HUB QA PASSED');
await browser.close();
