import type { Types } from 'mongoose';

import type { CategoryAttrs, CategoryDocument } from '../models/Category';
import type {
  ProductAttrs,
  ProductColorAttrs,
  ProductDocument,
  ProductImageAttrs,
} from '../models/Product';

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface PublicProductImage {
  id?: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface PublicProductColor {
  name: string;
  hex: string;
}

/**
 * Canonical commerce pricing plus storefront-friendly display fields.
 * - price: regular / list price
 * - salePrice: optional promotional price
 * - displayPrice: what the customer pays now (salePrice ?? price)
 * - originalPrice: crossed-out was-price when on sale (matches frontend Product.originalPrice)
 */
export interface PublicProductPricing {
  price: number;
  salePrice?: number;
  displayPrice: number;
  originalPrice?: number;
  onSale: boolean;
  currency: string;
}

export type AvailabilityState = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription?: string;
  description?: string;
  categoryId: string;
  category?: CategorySummary;
  productKind: string;
  price: number;
  salePrice?: number;
  displayPrice: number;
  originalPrice?: number;
  onSale: boolean;
  currency: string;
  images: PublicProductImage[];
  /** Primary image URL — storefront Product.imageSrc compatibility. */
  imageSrc?: string;
  imageAlt?: string;
  /** Ordered gallery URLs — compatible with normalizeGalleryImages. */
  gallery: string[];
  colors: PublicProductColor[];
  sizes: string[];
  stock: number;
  lowStockThreshold: number;
  inStock: boolean;
  availability: AvailabilityState;
  status: string;
  featured: boolean;
  badge?: string;
  tags: string[];
  material?: string;
  brand?: string;
  href: string;
  createdAt: string;
  updatedAt: string;
}

type CategoryLike =
  | CategoryDocument
  | (CategoryAttrs & { _id: Types.ObjectId })
  | { _id: Types.ObjectId | string; name: string; slug: string };

type ProductLike = ProductDocument | (ProductAttrs & { _id: Types.ObjectId });

function isPopulatedCategory(value: unknown): value is CategoryLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'slug' in value &&
    '_id' in value
  );
}

export function toPublicCategory(category: CategoryLike): PublicCategory {
  const doc = category as CategoryAttrs & {
    _id: Types.ObjectId | string;
    createdAt?: Date;
    updatedAt?: Date;
    isActive?: boolean;
    sortOrder?: number;
  };
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description || undefined,
    image: doc.image || undefined,
    isActive: Boolean(doc.isActive ?? true),
    sortOrder: doc.sortOrder ?? 0,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date(0).toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date(0).toISOString(),
  };
}

export function toCategorySummary(category: CategoryLike): CategorySummary {
  return {
    id: String(category._id),
    name: category.name,
    slug: category.slug,
  };
}

function sortImages(images: ProductImageAttrs[]): ProductImageAttrs[] {
  return [...images].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
}

function normalizeImages(
  images: ProductImageAttrs[],
): PublicProductImage[] {
  if (!images.length) return [];
  const sorted = sortImages(images);
  const hasPrimary = sorted.some((image) => image.isPrimary);
  return sorted.map((image, index) => ({
    id: (image as ProductImageAttrs & { _id?: Types.ObjectId })._id
      ? String((image as ProductImageAttrs & { _id?: Types.ObjectId })._id)
      : undefined,
    url: image.url,
    alt: image.alt || undefined,
    isPrimary: hasPrimary ? image.isPrimary : index === 0,
    sortOrder: image.sortOrder ?? index,
  }));
}

export function derivePricing(price: number, salePrice?: number | null): PublicProductPricing {
  const hasSale =
    salePrice != null && Number.isFinite(salePrice) && salePrice < price && salePrice >= 0;
  return {
    price,
    salePrice: hasSale ? salePrice! : undefined,
    displayPrice: hasSale ? salePrice! : price,
    originalPrice: hasSale ? price : undefined,
    onSale: hasSale,
    currency: '', // filled by caller
  };
}

export function deriveAvailability(
  stock: number,
  lowStockThreshold: number,
): AvailabilityState {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

function mapColors(colors: ProductColorAttrs[]): PublicProductColor[] {
  return colors.map((color) => ({ name: color.name, hex: color.hex }));
}

export function toPublicProduct(
  product: ProductLike,
  options?: { includeCategory?: boolean },
): PublicProduct {
  const categoryRaw = (product as ProductAttrs & { category: unknown }).category;
  let categoryId = '';
  let categorySummary: CategorySummary | undefined;

  if (isPopulatedCategory(categoryRaw)) {
    categoryId = String(categoryRaw._id);
    categorySummary = toCategorySummary(categoryRaw);
  } else if (categoryRaw != null) {
    categoryId = String(categoryRaw);
  }

  const images = normalizeImages(product.images ?? []);
  const pricing = derivePricing(product.price, product.salePrice);
  const availability = deriveAvailability(product.stock, product.lowStockThreshold);
  const primary = images.find((image) => image.isPrimary) ?? images[0];

  return {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription || undefined,
    description: product.description || undefined,
    categoryId,
    category: options?.includeCategory === false ? undefined : categorySummary,
    productKind: product.productKind,
    price: pricing.price,
    salePrice: pricing.salePrice,
    displayPrice: pricing.displayPrice,
    originalPrice: pricing.originalPrice,
    onSale: pricing.onSale,
    currency: product.currency,
    images,
    imageSrc: primary?.url,
    imageAlt: primary?.alt || product.name,
    gallery: images.map((image) => image.url),
    colors: mapColors(product.colors ?? []),
    sizes: [...(product.sizes ?? [])],
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    inStock: product.stock > 0,
    availability,
    status: product.status,
    featured: Boolean(product.featured),
    badge: product.badge || undefined,
    tags: [...(product.tags ?? [])],
    material: product.material || undefined,
    brand: product.brand || undefined,
    href: `/product/${product.slug}`,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

/** Leaner list projection — same shape, callers may omit heavy fields later. */
export function toProductListItem(product: ProductLike): PublicProduct {
  return toPublicProduct(product);
}
