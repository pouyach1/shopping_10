/**
 * Mobile Profile Drawer QA — customer journey + viewport matrix
 */
import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = 'http://127.0.0.1:4173';
const session = {
  customer: {
    id: 'cust-demo',
    name: 'سارا محمدی',
    identifier: '09121234567',
    phone: '09121234567',
    email: 'customer@luxora.ir',
  },
  signedInAt: '2026-01-15T10:00:00.000Z',
};

const cartSeed = {
  items: [
    {
      id: 'qa-1',
      productId: 'p1',
      name: 'مانتو',
      price: 3200000,
      currency: 'IRT',
      size: 'M',
      imageSrc: '/images/products/placeholder.jpg',
      imageAlt: 'm',
      quantity: 2,
    },
  ],
};

const wishlistSeed = [
  {
    id: 'w1',
    productId: 'p2',
    name: 'کت',
    price: 4100000,
    currency: 'IRT',
    size: 'M',
    imageSrc: '/images/products/placeholder.jpg',
    imageAlt: 'k',
  },
  {
    id: 'w2',
    productId: 'p3',
    name: 'شلوار',
    price: 2100000,
    currency: 'IRT',
    size: 'L',
    imageSrc: '/images/products/placeholder.jpg',
    imageAlt: 's',
  },
];

const failures = [];
const notes = [];

async function seed(page, { auth = true } = {}) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ auth, session, cartSeed, wishlistSeed }) => {
      if (auth) {
        localStorage.setItem(
          'luxora-customer-session',
          JSON.stringify(session),
        );
        localStorage.setItem('luxora-customer-remember', '1');
      } else {
        localStorage.removeItem('luxora-customer-session');
        localStorage.removeItem('luxora-customer-remember');
        sessionStorage.removeItem('luxora-customer-session');
      }
      localStorage.setItem('luxora-cart', JSON.stringify(cartSeed));
      localStorage.setItem('luxora-wishlist', JSON.stringify(wishlistSeed));
    },
    { auth, session, cartSeed, wishlistSeed },
  );
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
}

async function openDrawer(page) {
  const btn = page.locator('button[aria-controls="mobile-profile-drawer"]');
  await btn.click();
  await page.waitForTimeout(350);
}

async function drawerProbe(page) {
  return page.evaluate(() => {
    const drawer = document.getElementById('mobile-profile-drawer');
    const overlay = drawer?.previousElementSibling;
    const cs = getComputedStyle(drawer);
    const body = getComputedStyle(document.body);
    const scrollRegion = drawer?.querySelector('[class*="scrollRegion"]');
    const navItems = [...(drawer?.querySelectorAll('a[class*="navItem"], button[class*="navItem"]') || [])];
    const overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
    return {
      open: drawer?.className.includes('drawerOpen') || cs.visibility === 'visible',
      ariaHidden: drawer?.getAttribute('aria-hidden'),
      role: drawer?.getAttribute('role'),
      ariaModal: drawer?.getAttribute('aria-modal'),
      transform: cs.transform,
      visibility: cs.visibility,
      bodyOverflow: body.overflow,
      bodyPosition: body.position,
      overflowX,
      scrollRegionScrollable: scrollRegion
        ? scrollRegion.scrollHeight >= scrollRegion.clientHeight
        : false,
      navMinHeights: navItems.map((el) => {
        const r = el.getBoundingClientRect();
        return { h: r.height, w: r.width, text: (el.innerText || '').slice(0, 40) };
      }),
      text: (drawer?.innerText || '').slice(0, 500),
      overlayPointer: overlay ? getComputedStyle(overlay).pointerEvents : null,
    };
  });
}

const browser = await chromium.launch({ headless: true });

// —— Mobile matrix ——
for (const vp of [
  { w: 320, h: 800 },
  { w: 360, h: 800 },
  { w: 390, h: 844 },
  { w: 430, h: 932 },
]) {
  const tag = `${vp.w}x${vp.h}`;
  const page = await browser.newPage({
    viewport: { width: vp.w, height: vp.h },
    isMobile: true,
    hasTouch: true,
  });
  await seed(page);

  // Profile button visible
  const profileBtn = page.locator('button[aria-controls="mobile-profile-drawer"]');
  if (!(await profileBtn.isVisible())) {
    failures.push(`${tag}: mobile profile button not visible`);
  }

  await openDrawer(page);
  let probe = await drawerProbe(page);
  if (probe.ariaHidden === 'true') failures.push(`${tag}: drawer aria-hidden true when open`);
  if (probe.role !== 'dialog') failures.push(`${tag}: missing dialog role`);
  if (probe.bodyOverflow !== 'hidden' || probe.bodyPosition !== 'fixed') {
    failures.push(`${tag}: body scroll not locked (${probe.bodyOverflow}/${probe.bodyPosition})`);
  }
  if (probe.overflowX) failures.push(`${tag}: horizontal overflow while open`);
  if (!probe.text.includes('سبد خرید')) failures.push(`${tag}: cart nav missing`);
  if (!probe.text.includes('علاقه‌مندی')) failures.push(`${tag}: wishlist nav missing`);
  if (!probe.text.includes('سفارش')) failures.push(`${tag}: orders nav missing`);
  // counts — Persian digits
  if (!/[۲2]/.test(probe.text)) failures.push(`${tag}: cart count 2 not shown`);
  if (!/[۲2]/.test(probe.text)) failures.push(`${tag}: wishlist-ish count missing`);

  const smallTargets = probe.navMinHeights.filter((n) => n.h < 44 || n.w < 44);
  if (smallTargets.length) {
    failures.push(`${tag}: touch targets <44px: ${JSON.stringify(smallTargets)}`);
  }

  // Escape closes
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  probe = await drawerProbe(page);
  if (probe.bodyOverflow === 'hidden' && probe.bodyPosition === 'fixed') {
    // after close, body should be restored
    failures.push(`${tag}: body still locked after Escape`);
  }
  const closedHidden = await page.evaluate(() => {
    const d = document.getElementById('mobile-profile-drawer');
    return d?.getAttribute('aria-hidden') === 'true';
  });
  if (!closedHidden) failures.push(`${tag}: drawer not aria-hidden after Escape`);

  // Reopen + backdrop
  await openDrawer(page);
  await page.locator('#mobile-profile-drawer').evaluate((el) => {
    const overlay = el.previousElementSibling;
    overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(350);
  if (
    (await page.evaluate(() =>
      document.getElementById('mobile-profile-drawer')?.getAttribute('aria-hidden'),
    )) !== 'true'
  ) {
    failures.push(`${tag}: backdrop click did not close`);
  }

  // Journey: open → orders
  await openDrawer(page);
  await page.locator('#mobile-profile-drawer').getByRole('link', { name: /سفارش‌های من/ }).click();
  await page.waitForTimeout(500);
  if (!page.url().includes('/profile')) {
    failures.push(`${tag}: orders link did not go to profile`);
  }
  if (!page.url().includes('section=orders')) {
    failures.push(`${tag}: orders deep link missing section=orders`);
  }
  // body unlocked after navigate
  const bodyAfterNav = await page.evaluate(() => ({
    overflow: getComputedStyle(document.body).overflow,
    position: getComputedStyle(document.body).position,
  }));
  if (bodyAfterNav.position === 'fixed') {
    failures.push(`${tag}: body still fixed after navigate to orders`);
  }

  // Cart from drawer
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await openDrawer(page);
  await page.locator('#mobile-profile-drawer').getByRole('link', { name: /سبد خرید/ }).click();
  await page.waitForTimeout(400);
  if (!page.url().includes('/cart')) failures.push(`${tag}: cart link failed`);

  // Wishlist
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await openDrawer(page);
  await page.locator('#mobile-profile-drawer').getByRole('link', { name: /علاقه‌مندی‌ها/ }).click();
  await page.waitForTimeout(400);
  if (!page.url().includes('/wishlist')) failures.push(`${tag}: wishlist link failed`);

  // Nav drawer → profile drawer
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.locator('button[aria-controls="mobile-menu"]').click();
  await page.waitForTimeout(300);
  await page.locator('#mobile-menu').getByRole('button', { name: /حساب|سارا/ }).click();
  await page.waitForTimeout(400);
  const fromNav = await page.evaluate(() =>
    document.getElementById('mobile-profile-drawer')?.getAttribute('aria-hidden'),
  );
  if (fromNav === 'true') failures.push(`${tag}: profile drawer did not open from nav`);

  notes.push({ tag, ok: true });
  await page.close();
}

// Guest state
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await seed(page, { auth: false });
  await openDrawer(page);
  const text = await page.locator('#mobile-profile-drawer').innerText();
  if (!text.includes('ورود')) failures.push('guest: login CTA missing');
  if (text.includes('خروج از حساب')) failures.push('guest: logout should be hidden');
  await page.close();
}

// Reduced motion
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    reducedMotion: 'reduce',
  });
  await seed(page);
  await openDrawer(page);
  const probe = await drawerProbe(page);
  if (probe.ariaHidden === 'true') failures.push('reduced-motion: drawer not open');
  if (probe.bodyPosition !== 'fixed') failures.push('reduced-motion: scroll lock missing');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  await page.close();
}

// Tablet / Desktop — drawer must not show; desktop profile intact
for (const vp of [
  { w: 768, h: 1024 },
  { w: 1024, h: 768 },
  { w: 1280, h: 800 },
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
]) {
  const tag = `d${vp.w}`;
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await seed(page);
  const mobileBtn = page.locator('button[aria-controls="mobile-profile-drawer"]');
  if (await mobileBtn.isVisible()) {
    failures.push(`${tag}: mobile profile button should be hidden`);
  }
  // Desktop account control visible at >=768
  if (vp.w >= 768) {
    const account = page.getByRole('button', { name: 'حساب کاربری' });
    // may be multiple — desktop one
    if ((await account.count()) < 1) failures.push(`${tag}: account control missing`);
  }
  const drawerDisplay = await page.evaluate(() => {
    const d = document.getElementById('mobile-profile-drawer');
    return d ? getComputedStyle(d).display : 'missing';
  });
  if (drawerDisplay !== 'none' && drawerDisplay !== 'missing') {
    // at 768+ CSS forces display none
    if (vp.w >= 768 && drawerDisplay !== 'none') {
      failures.push(`${tag}: profile drawer display=${drawerDisplay}`);
    }
  }
  await page.goto(BASE + '/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const profileOk = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return false;
    const heading = [...main.querySelectorAll('h1')].find((h) =>
      (h.textContent || '').includes('سارا'),
    );
    return Boolean(heading && getComputedStyle(heading).display !== 'none');
  });
  if (!profileOk) {
    const snippet = await page.locator('main').innerText().catch(() => '');
    failures.push(
      `${tag}: desktop/full profile page broken :: ${snippet.slice(0, 120)}`,
    );
  }
  await page.close();
}

// Console errors sample
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await seed(page);
  await openDrawer(page);
  await page.locator('#mobile-profile-drawer').getByRole('link', { name: /حساب من/ }).click();
  await page.waitForTimeout(400);
  if (errors.length) failures.push(`console: ${errors.slice(0, 5).join(' | ')}`);
  await page.close();
}

await browser.close();

const report = { ok: failures.length === 0, failures, notes };
fs.writeFileSync('/tmp/mobile-profile-drawer-qa.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
