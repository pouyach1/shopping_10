import type { ProductImage, ProductStatus } from '../types/product';
import { normalizeProductImages } from './productImages';

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'فعال',
  draft: 'پیش‌نویس',
  archived: 'آرشیو',
};

export type StockFilter = 'all' | 'low' | 'out';

export const STOCK_FILTER_LABELS: Record<StockFilter, string> = {
  all: 'همه موجودی‌ها',
  low: 'کم‌موجودی',
  out: 'ناموجود',
};

/** Predefined fashion size chips for the product form. */
export const FASHION_SIZE_OPTIONS = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'فری‌سایز',
] as const;

export type FashionSizeOption = (typeof FASHION_SIZE_OPTIONS)[number];

export function slugifyProductName(name: string): string {
  return name
    .trim()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9-]+/gi, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getDiscountPercent(price: number, originalPrice?: number): number {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function isLowStock(stock: number, threshold: number): boolean {
  return stock > 0 && stock <= threshold;
}

export function isOutOfStock(stock: number): boolean {
  return stock <= 0;
}

export function isValidHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export interface ProductFormValues {
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  price: string;
  originalPrice: string;
  currency: string;
  images: ProductImage[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  stock: string;
  lowStockThreshold: string;
  status: ProductStatus;
  badge: string;
  sku: string;
}

export interface ProductFormErrors {
  name?: string;
  slug?: string;
  categoryId?: string;
  price?: string;
  originalPrice?: string;
  stock?: string;
  lowStockThreshold?: string;
  images?: string;
  colors?: string;
}

export function createEmptyProductForm(
  defaults?: Partial<ProductFormValues>,
): ProductFormValues {
  return {
    name: '',
    slug: '',
    categoryId: '',
    description: '',
    price: '',
    originalPrice: '',
    currency: 'تومان',
    images: [],
    sizes: [],
    colors: [],
    stock: '0',
    lowStockThreshold: '5',
    status: 'draft',
    badge: '',
    sku: '',
    ...defaults,
  };
}

export function validateProductForm(values: ProductFormValues): ProductFormErrors {
  const errors: ProductFormErrors = {};

  if (!values.name.trim()) {
    errors.name = 'نام محصول الزامی است.';
  }

  if (!values.slug.trim()) {
    errors.slug = 'شناسه محصول (slug) الزامی است.';
  }

  if (!values.categoryId) {
    errors.categoryId = 'انتخاب دسته‌بندی الزامی است.';
  }

  const price = Number(values.price);
  if (values.price.trim() === '' || Number.isNaN(price)) {
    errors.price = 'قیمت فروش را وارد کنید.';
  } else if (price < 0) {
    errors.price = 'قیمت نمی‌تواند منفی باشد.';
  }

  if (values.originalPrice.trim() !== '') {
    const original = Number(values.originalPrice);
    if (Number.isNaN(original) || original < 0) {
      errors.originalPrice = 'قیمت قبلی معتبر نیست.';
    } else if (!Number.isNaN(price) && original < price) {
      errors.originalPrice = 'قیمت قبل از تخفیف نباید از قیمت فروش کمتر باشد.';
    }
  }

  const stock = Number(values.stock);
  if (values.stock.trim() === '' || Number.isNaN(stock) || stock < 0) {
    errors.stock = 'موجودی باید صفر یا بیشتر باشد.';
  }

  const threshold = Number(values.lowStockThreshold);
  if (
    values.lowStockThreshold.trim() === '' ||
    Number.isNaN(threshold) ||
    threshold < 0
  ) {
    errors.lowStockThreshold = 'آستانه کم‌موجودی معتبر نیست.';
  }

  if (
    values.colors.some(
      (color) => color.name.trim() && !isValidHexColor(color.hex),
    )
  ) {
    errors.colors = 'یکی از رنگ‌ها مقدار معتبری ندارد. لطفاً دوباره انتخاب کنید.';
  }

  return errors;
}

/** Extra sizes present on a product but not in the fashion chip list (e.g. shoe sizes). */
export function getLegacySizeOptions(selected: string[]): string[] {
  const known = new Set<string>(FASHION_SIZE_OPTIONS);
  return selected.filter((size) => !known.has(size));
}

export function toggleSizeSelection(selected: string[], size: string): string[] {
  if (selected.includes(size)) {
    return selected.filter((item) => item !== size);
  }
  return [...selected, size];
}

export function productToFormValues(
  product: Parameters<typeof normalizeProductImages>[0] & {
    name: string;
    slug: string;
    categoryId: string;
    description?: string;
    price: number;
    originalPrice?: number;
    currency: string;
    sizes?: string[];
    colors?: { name: string; hex: string }[];
    stock: number;
    lowStockThreshold: number;
    status: ProductStatus;
    badge?: string;
    sku?: string;
  },
): ProductFormValues {
  return createEmptyProductForm({
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    description: product.description ?? '',
    price: String(product.price),
    originalPrice:
      product.originalPrice !== undefined ? String(product.originalPrice) : '',
    currency: product.currency,
    images: normalizeProductImages(product),
    sizes: product.sizes ?? [],
    colors: (product.colors ?? []).map((color) => ({
      name: color.name,
      hex: normalizeHex(color.hex),
    })),
    stock: String(product.stock),
    lowStockThreshold: String(product.lowStockThreshold),
    status: product.status,
    badge: product.badge ?? '',
    sku: product.sku ?? '',
  });
}

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }
  return '#B89B5E';
}
