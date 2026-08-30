import {
  FREE_SHIPPING_THRESHOLD,
} from '../config/constants';
import type { PublicProduct } from './catalog.mapper';
import { derivePricing } from './catalog.mapper';

export interface CartLineProductDto {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number;
  displayPrice: number;
  originalPrice?: number;
  onSale: boolean;
  currency: string;
  imageSrc?: string;
  imageAlt?: string;
  gallery: string[];
  stock: number;
  productKind: string;
  category?: { id: string; name: string; slug: string };
  status: string;
  inStock: boolean;
  availability: string;
  href: string;
}

export interface CartLineDto {
  /** Stable line key matching storefront `${productId}__${color}__${size}`. */
  id: string;
  lineId: string;
  productId: string;
  quantity: number;
  size: string;
  color?: string;
  colorValue?: string;
  /** Current authoritative unit price (displayPrice). */
  unitPrice: number;
  unitPriceSnapshot: number;
  priceChanged: boolean;
  lineTotal: number;
  currency: string;
  /** False when product missing, inactive, or out of stock. */
  available: boolean;
  /** True when the line can proceed toward checkout. */
  purchasable: boolean;
  unavailableReason?: string;
  product: CartLineProductDto | null;
  /** Presentation fields mirrored for CartItem compatibility. */
  name: string;
  price: number;
  imageSrc: string;
  imageAlt: string;
  addedAt?: string;
  updatedAt?: string;
}

export interface CartSummaryDto {
  subtotal: number;
  itemCount: number;
  lineCount: number;
  currency: string;
  freeShippingThreshold: number;
  qualifiesForFreeShipping: boolean;
  amountToFreeShipping: number;
  hasUnavailableItems: boolean;
  hasPriceChanges: boolean;
}

export interface CartDto {
  items: CartLineDto[];
  summary: CartSummaryDto;
}

export interface WishlistItemDto {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: string;
  size: string;
  imageSrc: string;
  imageAlt: string;
  available: boolean;
  purchasable: boolean;
  unavailableReason?: string;
  product: CartLineProductDto | null;
}

export interface WishlistDto {
  items: WishlistItemDto[];
  itemCount: number;
}

export function buildLineKey(
  productId: string,
  color = '',
  size = '',
): string {
  return `${productId}__${color}__${size}`;
}

export function toCartLineProduct(product: PublicProduct): CartLineProductDto {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    salePrice: product.salePrice,
    displayPrice: product.displayPrice,
    originalPrice: product.originalPrice,
    onSale: product.onSale,
    currency: product.currency,
    imageSrc: product.imageSrc,
    imageAlt: product.imageAlt,
    gallery: product.gallery,
    stock: product.stock,
    productKind: product.productKind,
    category: product.category,
    status: product.status,
    inStock: product.inStock,
    availability: product.availability,
    href: product.href,
  };
}

export function resolveLineAvailability(product: PublicProduct | null): {
  available: boolean;
  purchasable: boolean;
  reason?: string;
} {
  if (!product) {
    return {
      available: false,
      purchasable: false,
      reason: 'محصول دیگر در دسترس نیست.',
    };
  }
  if (product.status !== 'active') {
    return {
      available: false,
      purchasable: false,
      reason: 'این محصول دیگر موجود نیست.',
    };
  }
  if (product.stock <= 0) {
    return {
      available: false,
      purchasable: false,
      reason: 'موجودی این محصول به پایان رسیده است.',
    };
  }
  return { available: true, purchasable: true };
}

export function buildCartSummary(items: CartLineDto[]): CartSummaryDto {
  const purchasable = items.filter((item) => item.purchasable);
  const subtotal = purchasable.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = purchasable.reduce((sum, item) => sum + item.quantity, 0);
  const currency = items[0]?.currency ?? 'تومان';
  const qualifies = subtotal >= FREE_SHIPPING_THRESHOLD;
  const amountToFreeShipping = qualifies
    ? 0
    : Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return {
    subtotal,
    itemCount,
    lineCount: items.length,
    currency,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    qualifiesForFreeShipping: qualifies,
    amountToFreeShipping,
    hasUnavailableItems: items.some((item) => !item.available),
    hasPriceChanges: items.some((item) => item.priceChanged),
  };
}

/** Re-export derivePricing for commerce services that need unit price. */
export { derivePricing };
