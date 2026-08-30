import type { Currency } from './common';

export const CART_STORAGE_KEY = 'luxora-cart';

export interface CartItem {
  id: string;
  productId: string;
  /** Catalog slug for backend resolution when productId is still a mock id. */
  slug?: string;
  name: string;
  price: number;
  currency: Currency;
  size: string;
  color?: string;
  colorValue?: string;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
}
