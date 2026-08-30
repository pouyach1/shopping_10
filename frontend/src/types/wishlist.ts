import type { Currency } from './common';

export const WISHLIST_STORAGE_KEY = 'luxora-wishlist';

export interface WishlistItem {
  id: string;
  productId: string;
  /** Catalog slug for backend resolution when productId is still a mock id. */
  slug?: string;
  name: string;
  price: number;
  currency: Currency;
  size: string;
  imageSrc: string;
  imageAlt: string;
  comment?: string;
}
