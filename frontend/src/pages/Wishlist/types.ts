export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  currency: string;
  size: string;
  imageSrc: string;
  imageAlt: string;
  comment?: string;
}

export const WISHLIST_STORAGE_KEY = 'luxora-wishlist';
export const CART_STORAGE_KEY = 'luxora-cart';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  currency: string;
  size: string;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
}
