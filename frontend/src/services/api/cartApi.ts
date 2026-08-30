import type { CartItem } from '../../types/cart';
import { apiRequest, isMongoObjectId } from './http';

export interface CartApiProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number;
  displayPrice: number;
  originalPrice?: number;
  currency: string;
  imageSrc?: string;
  imageAlt?: string;
  gallery: string[];
  stock: number;
  productKind: string;
  status: string;
  href: string;
}

export interface CartApiLine {
  id: string;
  lineId: string;
  productId: string;
  quantity: number;
  size: string;
  color?: string;
  colorValue?: string;
  unitPrice: number;
  priceChanged: boolean;
  lineTotal: number;
  currency: string;
  available: boolean;
  purchasable: boolean;
  unavailableReason?: string;
  name: string;
  price: number;
  imageSrc: string;
  imageAlt: string;
  product: CartApiProduct | null;
}

export interface CartApiSummary {
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

export interface CartApiResponse {
  items: CartApiLine[];
  summary: CartApiSummary;
  skipped?: Array<{ productId: string; reason: string }>;
}

export function cartLineToCartItem(line: CartApiLine): CartItem {
  return {
    id: line.id,
    productId: line.productId,
    name: line.name,
    price: line.price,
    currency: line.currency,
    size: line.size,
    color: line.color,
    colorValue: line.colorValue,
    imageSrc: line.imageSrc,
    imageAlt: line.imageAlt,
    quantity: line.quantity,
  };
}

export async function fetchCart(): Promise<CartApiResponse> {
  return apiRequest<CartApiResponse>('/api/v1/cart');
}

export async function addCartItem(input: {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
  colorValue?: string;
}): Promise<CartApiResponse> {
  return apiRequest<CartApiResponse>('/api/v1/cart/items', {
    method: 'POST',
    body: input,
  });
}

export async function updateCartItem(
  productId: string,
  input: { quantity: number; size?: string; color?: string },
): Promise<CartApiResponse> {
  const params = new URLSearchParams();
  if (input.size) params.set('size', input.size);
  if (input.color) params.set('color', input.color);
  const qs = params.toString();
  return apiRequest<CartApiResponse>(
    `/api/v1/cart/items/${productId}${qs ? `?${qs}` : ''}`,
    {
      method: 'PATCH',
      body: { quantity: input.quantity },
    },
  );
}

export async function removeCartItem(
  productId: string,
  variant?: { size?: string; color?: string },
): Promise<CartApiResponse> {
  const params = new URLSearchParams();
  if (variant?.size) params.set('size', variant.size);
  if (variant?.color) params.set('color', variant.color);
  const qs = params.toString();
  return apiRequest<CartApiResponse>(
    `/api/v1/cart/items/${productId}${qs ? `?${qs}` : ''}`,
    { method: 'DELETE' },
  );
}

export async function clearRemoteCart(): Promise<CartApiResponse> {
  return apiRequest<CartApiResponse>('/api/v1/cart', { method: 'DELETE' });
}

export async function mergeCart(items: CartItem[]): Promise<CartApiResponse> {
  const payload = items
    .filter((item) => isMongoObjectId(item.productId))
    .map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      size: item.size || '',
      color: item.color || '',
      colorValue: item.colorValue,
    }));

  return apiRequest<CartApiResponse>('/api/v1/cart/merge', {
    method: 'POST',
    body: { items: payload },
  });
}
