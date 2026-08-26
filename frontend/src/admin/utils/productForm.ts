import type { ProductStatus } from '../types/product';

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

export function isValidImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/') || trimmed.startsWith('data:')) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface ProductFormValues {
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  price: string;
  originalPrice: string;
  currency: string;
  imageSrc: string;
  imageAlt: string;
  galleryText: string;
  sizesText: string;
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
  imageSrc?: string;
  galleryText?: string;
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
    imageSrc: '',
    imageAlt: '',
    galleryText: '',
    sizesText: '',
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

  if (!isValidImageUrl(values.imageSrc)) {
    errors.imageSrc = 'آدرس تصویر اصلی معتبر نیست.';
  }

  const galleryUrls = parseLines(values.galleryText);
  if (galleryUrls.some((url) => !isValidImageUrl(url))) {
    errors.galleryText = 'یکی از آدرس‌های گالری معتبر نیست.';
  }

  if (values.colors.some((color) => color.name.trim() && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.hex.trim()))) {
    errors.colors = 'کد رنگ باید به‌صورت هگز معتبر باشد (مثال: #B89B5E).';
  }

  return errors;
}

export function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseSizes(value: string): string[] {
  return value
    .split(/[,\n،]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
