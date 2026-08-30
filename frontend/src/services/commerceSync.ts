import { CART_STORAGE_KEY, type CartItem } from '../types/cart';
import { WISHLIST_STORAGE_KEY, type WishlistItem } from '../types/wishlist';
import {
  cartLineToCartItem,
  fetchCart,
  mergeCart,
} from './api/cartApi';
import {
  fetchWishlist,
  mergeWishlist,
  wishlistApiToItem,
} from './api/wishlistApi';
import { isAuthenticatedForApi } from './api/http';
import { resolveBackendProductId } from './api/catalogApi';

type CartHydrator = (items: CartItem[]) => void;
type WishlistHydrator = (items: WishlistItem[]) => void;

let hydrateCart: CartHydrator | null = null;
let hydrateWishlist: WishlistHydrator | null = null;
let readLocalCart: (() => CartItem[]) | null = null;
let readLocalWishlist: (() => WishlistItem[]) | null = null;

export function registerCartBridge(bridge: {
  hydrate: CartHydrator;
  readLocal: () => CartItem[];
}): void {
  hydrateCart = bridge.hydrate;
  readLocalCart = bridge.readLocal;
}

export function registerWishlistBridge(bridge: {
  hydrate: WishlistHydrator;
  readLocal: () => WishlistItem[];
}): void {
  hydrateWishlist = bridge.hydrate;
  readLocalWishlist = bridge.readLocal;
}

function clearLocalStorageKeys(): void {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * After login: merge guest LocalStorage into server, then hydrate from server.
 * Policy: matching lines sum quantities capped by stock (server merge endpoint).
 * Unresolvable mock ids are skipped — existing server cart is never wiped.
 */
export async function onAuthLoginSuccess(): Promise<void> {
  if (!isAuthenticatedForApi()) return;

  const localCart = readLocalCart?.() ?? [];
  const localWishlist = readLocalWishlist?.() ?? [];

  const resolvedCart: CartItem[] = [];
  for (const item of localCart) {
    const productId = await resolveBackendProductId({
      id: item.productId,
      href: item.slug ? `/product/${item.slug}` : undefined,
    });
    if (!productId) continue;
    resolvedCart.push({
      ...item,
      productId,
      id: `${productId}__${item.color ?? ''}__${item.size}`,
    });
  }

  const wishlistIds: string[] = [];
  for (const item of localWishlist) {
    const productId = await resolveBackendProductId({
      id: item.productId,
      href: item.slug ? `/product/${item.slug}` : undefined,
    });
    if (productId) wishlistIds.push(productId);
  }

  try {
    if (resolvedCart.length > 0) {
      await mergeCart(resolvedCart);
    }
    if (wishlistIds.length > 0) {
      await mergeWishlist(wishlistIds);
    }

    const [cart, wishlist] = await Promise.all([fetchCart(), fetchWishlist()]);
    clearLocalStorageKeys();
    hydrateCart?.(cart.items.map(cartLineToCartItem));
    hydrateWishlist?.(wishlist.items.map(wishlistApiToItem));
  } catch {
    // Keep local state if merge fails — do not pretend success wiped the guest cart.
  }
}

/** Logout: clear private hydrated state; guest starts empty. */
export function onAuthLogout(): void {
  clearLocalStorageKeys();
  hydrateCart?.([]);
  hydrateWishlist?.([]);
}

export async function refreshCommerceFromServer(): Promise<void> {
  if (!isAuthenticatedForApi()) return;
  try {
    const [cart, wishlist] = await Promise.all([fetchCart(), fetchWishlist()]);
    hydrateCart?.(cart.items.map(cartLineToCartItem));
    hydrateWishlist?.(wishlist.items.map(wishlistApiToItem));
  } catch {
    // Soft fail — keep current UI state.
  }
}
