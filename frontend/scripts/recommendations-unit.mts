import assert from 'node:assert/strict';
import {
  getProductRecommendations,
  inferProductKind,
  uniqueCatalog,
} from '../src/lib/productRecommendations.ts';
import type { SearchProduct } from '../src/pages/Search/types.ts';

function mockProduct(
  partial: Partial<SearchProduct> &
    Pick<SearchProduct, 'id' | 'name' | 'category'>,
): SearchProduct {
  return {
    currency: 'تومان',
    imageSrc: '/x.webp',
    imageAlt: partial.name,
    href: `/product/${partial.id}`,
    description: partial.description || partial.name,
    tags: partial.tags || [],
    material: partial.material || 'Cotton',
    brand: 'LUXORA',
    sizes: ['M'],
    popularity: partial.popularity ?? 50,
    createdAt: '2026-01-01',
    price: partial.price ?? 1_000_000,
    ...partial,
  };
}

const catalog = uniqueCatalog([
  mockProduct({
    id: 'prod-1',
    name: 'بلوز حریر',
    category: 'women',
    tags: ['بلوز', 'حریر'],
    price: 1_290_000,
  }),
  mockProduct({
    id: 'prod-2',
    name: 'پالتو پشمی',
    category: 'women',
    tags: ['پالتو', 'پشمی'],
    price: 3_490_000,
  }),
  mockProduct({
    id: 'prod-3',
    name: 'شلوار لینن',
    category: 'men',
    tags: ['شلوار', 'لینن'],
    price: 890_000,
  }),
  mockProduct({
    id: 'prod-4',
    name: 'پلیور کشمیر',
    category: 'women',
    tags: ['پلیور', 'کشمیر'],
    price: 1_890_000,
  }),
  mockProduct({
    id: 'prod-5',
    name: 'دامن پیلیسه',
    category: 'women',
    tags: ['دامن', 'پیلیسه'],
    price: 1_590_000,
  }),
  mockProduct({
    id: 'prod-6',
    name: 'پیراهن سفید کلاسیک',
    category: 'women',
    tags: ['پیراهن', 'سفید'],
    price: 790_000,
  }),
  mockProduct({
    id: 'prod-1',
    name: 'بلوز duplicate',
    category: 'women',
    tags: ['بلوز'],
  }),
]);

assert.equal(catalog.length, 6);
assert.equal(inferProductKind(catalog[0]), 'top');
assert.equal(inferProductKind(catalog[1]), 'outerwear');
assert.equal(inferProductKind(catalog[2]), 'bottom');
assert.equal(inferProductKind(catalog[4]), 'bottom');

const blouse = getProductRecommendations('prod-1', catalog);
const blouseIds = [
  ...blouse.related,
  ...blouse.complementary,
  ...blouse.discovery,
].map((p) => p.id);

assert.equal(blouseIds.includes('prod-1'), false);
assert.equal(new Set(blouseIds).size, blouseIds.length);
assert.ok(blouse.related.length >= 2);
assert.ok(blouse.related.every((p) => !['prod-3', 'prod-5'].includes(p.id)));
assert.ok(
  blouse.complementary.some((p) => ['prod-3', 'prod-5'].includes(p.id)),
);

const tiny = getProductRecommendations('only', [
  mockProduct({ id: 'only', name: 'تنها', category: 'women', tags: ['بلوز'] }),
]);
assert.deepEqual(tiny, {
  related: [],
  complementary: [],
  discovery: [],
});

const singlePeer = getProductRecommendations('a', [
  mockProduct({ id: 'a', name: 'بلوز', category: 'women', tags: ['بلوز'] }),
  mockProduct({ id: 'b', name: 'پیراهن', category: 'women', tags: ['پیراهن'] }),
]);
assert.equal(
  [
    ...singlePeer.related,
    ...singlePeer.complementary,
    ...singlePeer.discovery,
  ].length,
  1,
);

console.log('PASS unit: recommendation logic + dedupe + empty catalog');
