/**
 * Phase 3.1 E2E: product edit UX + persistence.
 * Run: npx playwright test --config=playwright.product-ux.config.ts
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174';
const ARTIFACTS = '/opt/cursor/artifacts';
const UPLOAD = path.join(ARTIFACTS, 'test-product-upload.png');

test.describe('Phase 3.1 product UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/admin/login`);
    await page.evaluate(() => {
      localStorage.removeItem('luxora-admin-data');
      localStorage.setItem('luxora-admin-authenticated', 'true');
    });
    await page.goto(`${BASE}/admin/products/prod-luna-bag`);
    await expect(page.getByRole('heading', { name: 'ویرایش محصول' })).toBeVisible();
  });

  test('loads, edits, saves, persists', async ({ page }) => {
    // --- Populate check ---
    const name = page.locator('label').filter({ hasText: 'نام محصول' }).locator('input');
    const slug = page.locator('label').filter({ hasText: 'شناسه' }).locator('input');
    const description = page.locator('label').filter({ hasText: 'توضیحات' }).locator('textarea');
    const price = page.locator('label').filter({ hasText: 'قیمت فروش' }).locator('input');
    const original = page.locator('label').filter({ hasText: 'قیمت قبل از تخفیف' }).locator('input');
    const currency = page.locator('label').filter({ hasText: 'واحد پول' }).locator('input');
    const badge = page.locator('label').filter({ hasText: 'برچسب نمایشی' }).locator('input');
    const stock = page.locator('label').filter({ hasText: /^موجودی$/ }).locator('input');
    const threshold = page.locator('label').filter({ hasText: 'آستانه کم‌موجودی' }).locator('input');
    const category = page.locator('label').filter({ hasText: 'دسته‌بندی' }).locator('select');
    const status = page.locator('label').filter({ hasText: 'وضعیت' }).locator('select');

    await expect(name).toHaveValue('کیف دستی چرم لونا');
    await expect(slug).toHaveValue('luna-leather-handbag');
    await expect(description).toContainText('چرم');
    await expect(price).toHaveValue('4590000');
    await expect(original).toHaveValue('');
    await expect(currency).toHaveValue('تومان');
    await expect(badge).toHaveValue('جدید');
    await expect(stock).toHaveValue('9');
    await expect(threshold).toHaveValue('5');
    await expect(category).toHaveValue('cat-bags');
    await expect(status).toHaveValue('active');

    // Size chips — فری‌سایز selected
    const freeSize = page.getByRole('button', { name: 'فری‌سایز', exact: true });
    await expect(freeSize).toHaveAttribute('aria-pressed', 'true');

    // Colors — swatch + name + color picker, no hex text
    await expect(page.getByPlaceholder('نام رنگ (مثلاً مشکی)').nth(0)).toHaveValue('مشکی');
    await expect(page.getByPlaceholder('نام رنگ (مثلاً مشکی)').nth(1)).toHaveValue('قهوه‌ای');
    await expect(page.locator('input[type="color"]')).toHaveCount(2);
    await expect(page.locator('input[placeholder="#B89B5E"]')).toHaveCount(0);
    await expect(page.getByText('آدرس تصویر اصلی')).toHaveCount(0);

    // Primary image from seed
    await expect(page.getByText('تصویر اصلی')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACTS}/ux-edit-loaded.png`,
      fullPage: true,
    });

    // --- Edit fields ---
    await name.fill('کیف دستی چرم لونا — تست');
    await price.fill('4690000');
    await category.selectOption('cat-accessories');

    const sizeM = page.getByRole('button', { name: 'M', exact: true });
    await sizeM.click();
    await expect(sizeM).toHaveAttribute('aria-pressed', 'true');
    await freeSize.click();
    await expect(freeSize).toHaveAttribute('aria-pressed', 'false');

    await page.getByRole('button', { name: /افزودن رنگ/ }).click();
    const colorNames = page.getByPlaceholder('نام رنگ (مثلاً مشکی)');
    await expect(colorNames).toHaveCount(3);
    await colorNames.nth(2).fill('کرم');
    await page.locator('input[type="color"]').nth(2).fill('#E8D5B7');

    // Remove brown
    await page.getByRole('button', { name: 'حذف رنگ' }).nth(1).click();
    await expect(colorNames).toHaveCount(2);

    // Upload image
    await page.locator('input[type="file"]').setInputFiles(UPLOAD);
    await expect(page.locator('ul[aria-label="تصاویر محصول"] li')).toHaveCount(2, {
      timeout: 10000,
    });

    // Set uploaded as primary (second item star button)
    const items = page.locator('ul[aria-label="تصاویر محصول"] li');
    await items.nth(1).getByRole('button', { name: 'تنظیم به‌عنوان تصویر اصلی' }).click();
    await expect(items.nth(1)).toContainText('تصویر اصلی');

    await page.screenshot({
      path: `${ARTIFACTS}/ux-edit-before-save.png`,
      fullPage: true,
    });

    // Save — must update, not create
    await page.getByRole('button', { name: 'ذخیره تغییرات' }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(page.getByText('تغییرات محصول ذخیره شد.')).toBeVisible();
    await expect(page.getByText('کیف دستی چرم لونا — تست').first()).toBeVisible();
    // fa-IR formatted price (Persian digits)
    await expect(
      page.getByText(new Intl.NumberFormat('fa-IR').format(4690000)).first(),
    ).toBeVisible();

    await page.screenshot({ path: `${ARTIFACTS}/ux-list-after-save.png`, fullPage: true });

    // Refresh + reopen
    await page.reload();
    await page.goto(`${BASE}/admin/products/prod-luna-bag`);
    await expect(name).toHaveValue('کیف دستی چرم لونا — تست');
    await expect(price).toHaveValue('4690000');
    await expect(category).toHaveValue('cat-accessories');
    await expect(sizeM).toHaveAttribute('aria-pressed', 'true');
    await expect(freeSize).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByPlaceholder('نام رنگ (مثلاً مشکی)').nth(1)).toHaveValue('کرم');
    await expect(page.locator('ul[aria-label="تصاویر محصول"] li')).toHaveCount(2);
    await expect(page.getByText('تصویر اصلی').first()).toBeVisible();

    // Product count unchanged (update not create)
    const data = await page.evaluate(() => {
      const raw = localStorage.getItem('luxora-admin-data');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        count: parsed.products.length,
        product: parsed.products.find((p: { id: string }) => p.id === 'prod-luna-bag'),
      };
    });
    expect(data?.count).toBe(12);
    expect(data?.product?.name).toBe('کیف دستی چرم لونا — تست');
    expect(data?.product?.price).toBe(4690000);
    expect(data?.product?.colors?.some((c: { name: string }) => c.name === 'کرم')).toBe(true);
    expect(data?.product?.images?.length).toBe(2);
    expect(data?.product?.imageSrc).toBeTruthy();

    await page.screenshot({
      path: `${ARTIFACTS}/ux-edit-after-reload.png`,
      fullPage: true,
    });

    // Dark mode
    await page.getByTestId('admin-theme-toggle').click();
    await expect(page.locator('[data-admin-root][data-theme="dark"]')).toBeVisible();
    await page.screenshot({
      path: `${ARTIFACTS}/ux-edit-dark.png`,
      fullPage: true,
    });

    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `${ARTIFACTS}/ux-edit-mobile.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 900 });

    // Dashboard reflects
    await page.goto(`${BASE}/admin`);
    await expect(page.getByText(/۱۲|12/).first()).toBeVisible();

    // Storefront — solid swatches, no hex shown to customers
    await page.goto(`${BASE}/product/silk-blend-blouse`);
    await expect(page.locator('body')).not.toContainText('#171717');
    await page.screenshot({ path: `${ARTIFACTS}/ux-storefront.png`, fullPage: true });
  });

  test('shoe product keeps legacy numeric size chips', async ({ page }) => {
    await page.goto(`${BASE}/admin/products/prod-elise-heels`);
    await expect(page.getByRole('button', { name: '38', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'XS', exact: true })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACTS}/ux-shoe-sizes.png`, fullPage: true });
  });
});
