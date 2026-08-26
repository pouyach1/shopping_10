export type ProductStatus = 'active' | 'draft' | 'archived';

/**
 * Product media item.
 * `url` is a durable presentation URL:
 * - Vite/static asset path (seed data)
 * - https(s) URL (future CDN / object storage)
 * - data: URL (local demo uploads — see productImageUpload)
 *
 * Do not store File / Blob objects here. Object URLs (blob:) are display-only
 * and must never be persisted.
 */
export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  categoryId: string;
  description?: string;

  price: number;
  originalPrice?: number;
  currency: string;

  /** Canonical image list. Prefer this over legacy fields. */
  images?: ProductImage[];

  /**
   * Legacy primary image fields kept in sync with `images`
   * for storefront / list compatibility.
   */
  imageSrc?: string;
  imageAlt?: string;
  gallery?: string[];

  badge?: string;

  sizes?: string[];

  colors?: {
    name: string;
    hex: string;
  }[];

  stock: number;
  lowStockThreshold: number;

  status: ProductStatus;

  createdAt: string;
  updatedAt: string;
}
