/**
 * Lightweight Node checks for Phase 3.1 product helpers.
 * Run: npx --yes tsx scripts/check-product-ux.ts
 */
import assert from 'node:assert/strict';

import {
  FASHION_SIZE_OPTIONS,
  getLegacySizeOptions,
  productToFormValues,
  toggleSizeSelection,
  validateProductForm,
} from '../src/admin/utils/productForm';
import {
  normalizeAdminProduct,
  normalizeProductImages,
  setPrimaryImage,
  syncLegacyImageFields,
} from '../src/admin/utils/productImages';

const legacyProduct = {
  id: 'prod-elise-heels',
  name: 'کفش پاشنه‌دار الیز',
  slug: 'elise-heel-pumps',
  categoryId: 'cat-shoes',
  description: 'desc',
  price: 3190000,
  originalPrice: 3690000,
  currency: 'تومان',
  imageSrc: '/img/shoes.webp',
  imageAlt: 'کفش',
  gallery: ['/img/shoes-2.webp'],
  badge: 'تخفیف',
  sizes: ['36', '37', '38'],
  colors: [
    { name: 'مشکی', hex: '#171717' },
    { name: 'بژ', hex: '#D8C9B4' },
  ],
  stock: 4,
  lowStockThreshold: 5,
  status: 'active' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const images = normalizeProductImages(legacyProduct);
assert.equal(images.length, 2);
assert.equal(images.filter((i) => i.isPrimary).length, 1);
assert.equal(images[0].url, '/img/shoes.webp');
assert.equal(images[0].isPrimary, true);

const normalized = normalizeAdminProduct(legacyProduct);
assert.ok(normalized.images?.length === 2);
assert.equal(normalized.imageSrc, '/img/shoes.webp');
assert.deepEqual(normalized.gallery, ['/img/shoes-2.webp']);

const form = productToFormValues(normalized);
assert.equal(form.name, legacyProduct.name);
assert.equal(form.slug, legacyProduct.slug);
assert.equal(form.categoryId, legacyProduct.categoryId);
assert.equal(form.description, legacyProduct.description);
assert.equal(form.price, String(legacyProduct.price));
assert.equal(form.originalPrice, String(legacyProduct.originalPrice));
assert.equal(form.currency, legacyProduct.currency);
assert.equal(form.badge, legacyProduct.badge);
assert.equal(form.stock, '4');
assert.equal(form.lowStockThreshold, '5');
assert.equal(form.status, 'active');
assert.deepEqual(form.sizes, ['36', '37', '38']);
assert.equal(form.colors.length, 2);
assert.equal(form.images.length, 2);

const legacySizes = getLegacySizeOptions(form.sizes);
assert.deepEqual(legacySizes, ['36', '37', '38']);
assert.ok(FASHION_SIZE_OPTIONS.includes('فری‌سایز'));

let sizes = toggleSizeSelection([], 'M');
assert.deepEqual(sizes, ['M']);
sizes = toggleSizeSelection(sizes, 'M');
assert.deepEqual(sizes, []);

const withPrimary = setPrimaryImage(form.images, form.images[1].id);
assert.equal(withPrimary[1].isPrimary, true);
assert.equal(withPrimary[0].isPrimary, false);
const legacy = syncLegacyImageFields(withPrimary);
assert.equal(legacy.imageSrc, form.images[1].url);

const errors = validateProductForm({
  ...form,
  name: '',
  colors: [{ name: 'آبی', hex: 'not-a-color' }],
});
assert.ok(errors.name);
assert.ok(errors.colors);

console.log('Phase 3.1 product UX helper checks passed.');
