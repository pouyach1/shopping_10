import type { WishlistItem } from '../../types/wishlist';
import { apiRequest, isMongoObjectId } from './http';

export interface WishlistApiItem {
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
}

export interface WishlistApiResponse {
  items: WishlistApiItem[];
  itemCount: number;
}

export function wishlistApiToItem(item: WishlistApiItem): WishlistItem {
  return {
    id: item.id,
    productId: item.productId,
    name: item.name,
    price: item.price,
    currency: item.currency,
    size: item.size || '',
    imageSrc: item.imageSrc,
    imageAlt: item.imageAlt,
  };
}

export async function fetchWishlist(): Promise<WishlistApiResponse> {
  return apiRequest<WishlistApiResponse>('/api/v1/wishlist');
}

export async function addWishlistProduct(
  productId: string,
): Promise<WishlistApiResponse> {
  return apiRequest<WishlistApiResponse>(`/api/v1/wishlist/${productId}`, {
    method: 'POST',
  });
}

export async function removeWishlistProduct(
  productId: string,
): Promise<WishlistApiResponse> {
  return apiRequest<WishlistApiResponse>(`/api/v1/wishlist/${productId}`, {
    method: 'DELETE',
  });
}

export async function mergeWishlist(
  productIds: string[],
): Promise<WishlistApiResponse> {
  return apiRequest<WishlistApiResponse>('/api/v1/wishlist/merge', {
    method: 'POST',
    body: {
      productIds: productIds.filter(isMongoObjectId),
    },
  });
}
