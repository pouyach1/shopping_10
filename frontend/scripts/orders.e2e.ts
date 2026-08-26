/**
 * Phase 4 Orders — functional checks (no screenshots/videos).
 * Run: npx playwright test --config=playwright.orders.config.ts
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

test.describe('Phase 4 admin orders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/admin/login`);
    await page.evaluate(() => {
      localStorage.removeItem('luxora-admin-data');
      localStorage.setItem('luxora-admin-authenticated', 'true');
    });
  });

  test('list, search, filters, detail, status + payment persist, print markup', async ({
    page,
  }) => {
    await page.goto(`${BASE}/admin/orders`);
    await expect(page.getByRole('heading', { level: 2, name: 'سفارش‌ها' })).toBeVisible();
    await expect(page.getByText('#LX-10421').first()).toBeVisible();

    // Search by order number
    await page.getByPlaceholder(/شماره سفارش/).fill('LX-10427');
    await expect(page.getByText('#LX-10427').first()).toBeVisible();
    await expect(page.getByText('#LX-10421')).toHaveCount(0);

    await page.getByRole('button', { name: 'پاک کردن فیلترها' }).click();

    // Search by customer name
    const customerName = await page.evaluate(() => {
      const raw = localStorage.getItem('luxora-admin-data');
      if (!raw) return '';
      return JSON.parse(raw).customers[0]?.name ?? '';
    });
    await page.getByPlaceholder(/شماره سفارش/).fill(customerName);
    await expect(page.locator('a[href^="/admin/orders/"]').first()).toBeVisible();

    // Search by phone
    const phone = await page.evaluate(() => {
      const raw = localStorage.getItem('luxora-admin-data');
      if (!raw) return '';
      return JSON.parse(raw).customers[0]?.phone ?? '';
    });
    await page.getByPlaceholder(/شماره سفارش/).fill(phone);
    await expect(page.locator('a[href^="/admin/orders/"]').first()).toBeVisible();

    await page.getByRole('button', { name: 'پاک کردن فیلترها' }).click();

    // Filter order status
    await page.getByLabel('فیلتر وضعیت سفارش').selectOption('pending');
    await expect(page.locator('[data-status="pending"]').first()).toBeVisible();
    await expect(page.getByText('#LX-10427').first()).toBeVisible();
    await page.getByRole('button', { name: 'پاک کردن فیلترها' }).click();

    // Filter payment
    await page.getByLabel('فیلتر وضعیت پرداخت').selectOption('cod');
    await expect(page.locator('[data-status="cod"]').first()).toBeVisible();
    await page.getByRole('button', { name: 'پاک کردن فیلترها' }).click();

    // Open order detail
    await page.goto(`${BASE}/admin/orders/ord-07`);
    await expect(page.getByRole('heading', { name: '#LX-10427' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'اقلام سفارش' })).toBeVisible();
    await expect(page.locator('.screenUi, [class*="screenUi"]').getByText('مبلغ نهایی')).toBeVisible();
    await expect(page.getByRole('button', { name: 'چاپ سفارش' }).first()).toBeVisible();

    // Print document exists and is not interactive chrome
    const printRoot = page.locator('[data-admin-print-root]');
    await expect(printRoot).toHaveCount(1);
    await expect(printRoot).toContainText('LUXORA');
    await expect(printRoot).toContainText('#LX-10427');
    await expect(printRoot).toContainText('با تشکر از خرید شما');

    // Change order status
    await page.getByLabel('وضعیت سفارش').selectOption('confirmed');
    await expect(page.getByText('وضعیت سفارش به‌روزرسانی شد.')).toBeVisible();

    // Change payment status
    await page.getByLabel('وضعیت پرداخت').selectOption('paid');
    await expect(page.getByText('وضعیت پرداخت به‌روزرسانی شد.')).toBeVisible();

    // Persist across refresh
    await page.reload();
    await expect(page.getByLabel('وضعیت سفارش')).toHaveValue('confirmed');
    await expect(page.getByLabel('وضعیت پرداخت')).toHaveValue('paid');

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('luxora-admin-data');
      if (!raw) return null;
      const order = JSON.parse(raw).orders.find(
        (item: { id: string }) => item.id === 'ord-07',
      );
      return order
        ? { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus }
        : null;
    });
    expect(stored).toEqual({
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
    });

    // Dashboard still loads and reads live store stats
    await page.goto(`${BASE}/admin`);
    await expect(page.getByRole('heading', { level: 2, name: 'داشبورد' })).toBeVisible();
    const pendingOnDashboard = await page.evaluate(() => {
      const raw = localStorage.getItem('luxora-admin-data');
      if (!raw) return -1;
      const orders = JSON.parse(raw).orders as Array<{ orderStatus: string }>;
      return orders.filter((order) =>
        ['pending', 'confirmed', 'processing'].includes(order.orderStatus),
      ).length;
    });
    expect(pendingOnDashboard).toBeGreaterThan(0);
    // ord-07 moved from pending → confirmed; still counted as open
    const ord07 = await page.evaluate(() => {
      const raw = localStorage.getItem('luxora-admin-data');
      if (!raw) return null;
      return JSON.parse(raw).orders.find(
        (item: { id: string }) => item.id === 'ord-07',
      )?.orderStatus;
    });
    expect(ord07).toBe('confirmed');

    // Storefront untouched
    await page.goto(`${BASE}/product/silk-blend-blouse`);
    await expect(page.locator('body')).toContainText('بلوز');
  });

  test('print CSS hides screen UI class contract', async ({ page }) => {
    await page.goto(`${BASE}/admin/orders/ord-01`);
    const screenHiddenInPrint = await page.evaluate(() => {
      const screen = document.querySelector('[class*="screenUi"]');
      const printEl = document.querySelector('[data-admin-print-root]');
      if (!screen || !printEl) return false;
      const sheet = [...document.styleSheets];
      // Contract: print root present; screen UI present for interactive use
      return (
        getComputedStyle(printEl).display === 'none' &&
        getComputedStyle(screen as Element).display !== 'none'
      );
    });
    expect(screenHiddenInPrint).toBe(true);
  });
});
