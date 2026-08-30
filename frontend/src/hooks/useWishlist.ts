import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import type { CartItem } from '../types/cart';
import type { Product } from '../types/product';
import {
  WISHLIST_STORAGE_KEY,
  type WishlistItem,
} from '../types/wishlist';
import { addItem as addItemToCart } from './useCart';
import {
  addWishlistProduct,
  fetchWishlist,
  removeWishlistProduct,
  wishlistApiToItem,
} from '../services/api/wishlistApi';
import { resolveBackendProductId } from '../services/api/catalogApi';
import {
  ApiError,
  isAuthenticatedForApi,
  isMongoObjectId,
} from '../services/api/http';
import { registerWishlistBridge } from '../services/commerceSync';

/**
 * Module-level wishlist store — shared by ProductCard, Header, Wishlist page.
 *
 * Guest → LocalStorage.
 * Authenticated + API → backend wishlist with optimistic toggle + rollback.
 */

let items: WishlistItem[] = loadInitial();
let lastError: string | null = null;
const listeners = new Set<() => void>();

function loadInitial(): WishlistItem[] {
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WishlistItem[]) : [];
  } catch {
    return [];
  }
}

function persistGuest(): void {
  if (isAuthenticatedForApi()) return;
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable — keep in-memory only.
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function setItems(next: WishlistItem[], options?: { persist?: boolean }): void {
  items = next;
  if (options?.persist !== false) persistGuest();
  emit();
}

function setError(message: string | null): void {
  lastError = message;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): WishlistItem[] {
  return items;
}

function getErrorSnapshot(): string | null {
  return lastError;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== WISHLIST_STORAGE_KEY) return;
    if (isAuthenticatedForApi()) return;
    items = loadInitial();
    emit();
  });
}

function applyServerWishlist(next: WishlistItem[]): void {
  setItems(next, { persist: false });
}

registerWishlistBridge({
  hydrate: (next) => applyServerWishlist(next),
  readLocal: () => items.slice(),
});

function toCartItem(item: WishlistItem): CartItem {
  return {
    id: item.id,
    productId: item.productId,
    slug: item.slug,
    name: item.name,
    price: item.price,
    currency: item.currency,
    size: item.size,
    imageSrc: item.imageSrc,
    imageAlt: item.imageAlt,
    quantity: 1,
  };
}

function slugFromHref(href?: string): string | undefined {
  if (!href) return undefined;
  return href.split('/').filter(Boolean).pop();
}

export function productToWishlistItem(product: Product): WishlistItem {
  return {
    id: product.id,
    productId: product.id,
    slug: slugFromHref(product.href),
    name: product.name,
    price: product.price,
    currency: product.currency,
    size: '',
    imageSrc: product.imageSrc,
    imageAlt: product.imageAlt,
  };
}

export function isInWishlist(productId: string): boolean {
  return items.some(
    (item) => item.productId === productId || item.id === productId,
  );
}

/** Returns true when the product was added; false when removed. */
export function toggleWishlistProduct(product: Product): boolean {
  const previous = items.slice();
  const existed = isInWishlist(product.id);

  if (existed) {
    setItems(
      items.filter(
        (item) => item.productId !== product.id && item.id !== product.id,
      ),
    );
  } else {
    setItems([productToWishlistItem(product), ...items]);
  }
  setError(null);

  if (!isAuthenticatedForApi()) return !existed;

  void (async () => {
    try {
      const productId =
        (await resolveBackendProductId({
          id: product.id,
          href: product.href,
        })) ?? null;
      if (!productId) {
        setItems(previous, { persist: false });
        setError('این محصول هنوز به کاتالوگ سرور متصل نشده است.');
        return;
      }
      const wishlist = existed
        ? await removeWishlistProduct(productId)
        : await addWishlistProduct(productId);
      applyServerWishlist(wishlist.items.map(wishlistApiToItem));
    } catch (error) {
      setItems(previous, { persist: false });
      setError(
        error instanceof ApiError
          ? error.message
          : 'به‌روزرسانی علاقه‌مندی‌ها انجام نشد.',
      );
    }
  })();

  return !existed;
}

export function removeWishlistItem(id: string): void {
  const previous = items.slice();
  const target = items.find((item) => item.id === id);
  setItems(items.filter((item) => item.id !== id));
  setError(null);

  if (!isAuthenticatedForApi() || !target) return;

  void (async () => {
    try {
      const productId = isMongoObjectId(target.productId)
        ? target.productId
        : await resolveBackendProductId({
            id: target.productId,
            href: target.slug ? `/product/${target.slug}` : undefined,
          });
      if (!productId) return;
      const wishlist = await removeWishlistProduct(productId);
      applyServerWishlist(wishlist.items.map(wishlistApiToItem));
    } catch (error) {
      setItems(previous, { persist: false });
      setError(
        error instanceof ApiError
          ? error.message
          : 'حذف از علاقه‌مندی‌ها انجام نشد.',
      );
    }
  })();
}

export function clearWishlistStore(): void {
  setItems([]);
}

export async function syncWishlistFromServer(): Promise<void> {
  if (!isAuthenticatedForApi()) return;
  const wishlist = await fetchWishlist();
  applyServerWishlist(wishlist.items.map(wishlistApiToItem));
}

export function useWishlist() {
  const wishlistItems = useSyncExternalStore(subscribe, getSnapshot);
  const syncError = useSyncExternalStore(subscribe, getErrorSnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setLocalError] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 2000);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (syncError) setFeedback(syncError);
  }, [syncError]);

  const removeItem = useCallback((id: string) => {
    removeWishlistItem(id);
  }, []);

  const updateItemSize = useCallback((id: string, size: string) => {
    setItems(
      getSnapshot().map((item) => (item.id === id ? { ...item, size } : item)),
    );
  }, []);

  const updateItemComment = useCallback((id: string, comment: string) => {
    setItems(
      getSnapshot().map((item) =>
        item.id === id ? { ...item, comment } : item,
      ),
    );
  }, []);

  const addToCart = useCallback((item: WishlistItem) => {
    addItemToCart(toCartItem(item));
  }, []);

  const addAllToCart = useCallback((allItems: WishlistItem[]) => {
    allItems.forEach((item) => addItemToCart(toCartItem(item)));
  }, []);

  const updateWishlist = useCallback(() => {
    persistGuest();
    setFeedback('لیست علاقه‌مندی‌ها ذخیره شد.');
  }, []);

  const clearWishlist = useCallback(() => {
    clearWishlistStore();
  }, []);

  const retry = useCallback(() => {
    setLocalError(false);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 200);
    if (isAuthenticatedForApi()) {
      void syncWishlistFromServer().catch(() => setLocalError(true));
    }
  }, []);

  const toggleProduct = useCallback((product: Product) => {
    const added = toggleWishlistProduct(product);
    setFeedback(added ? 'به علاقه‌مندی‌ها اضافه شد.' : 'از علاقه‌مندی‌ها حذف شد.');
    return added;
  }, []);

  return {
    items: wishlistItems,
    itemCount: wishlistItems.length,
    isLoading,
    error,
    feedback,
    removeItem,
    updateItemSize,
    updateItemComment,
    addToCart,
    addAllToCart,
    updateWishlist,
    clearWishlist,
    retry,
    toggleProduct,
    isInWishlist: (productId: string) =>
      wishlistItems.some(
        (item) => item.productId === productId || item.id === productId,
      ),
  };
}
