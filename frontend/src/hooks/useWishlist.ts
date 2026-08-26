import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import type { CartItem } from '../types/cart';
import type { Product } from '../types/product';
import {
  WISHLIST_STORAGE_KEY,
  type WishlistItem,
} from '../types/wishlist';
import { addItem as addItemToCart } from './useCart';

/**
 * Module-level wishlist store — shared by ProductCard, Header, Wishlist page.
 */

let items: WishlistItem[] = loadInitial();
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

function persist(): void {
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable — keep in-memory only.
  }
}

function setItems(next: WishlistItem[]): void {
  items = next;
  persist();
  listeners.forEach((listener) => listener());
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

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== WISHLIST_STORAGE_KEY) return;
    items = loadInitial();
    listeners.forEach((listener) => listener());
  });
}

function toCartItem(item: WishlistItem): CartItem {
  return {
    id: item.id,
    productId: item.productId,
    name: item.name,
    price: item.price,
    currency: item.currency,
    size: item.size,
    imageSrc: item.imageSrc,
    imageAlt: item.imageAlt,
    quantity: 1,
  };
}

export function productToWishlistItem(product: Product): WishlistItem {
  return {
    id: product.id,
    productId: product.id,
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
  if (isInWishlist(product.id)) {
    setItems(
      items.filter(
        (item) => item.productId !== product.id && item.id !== product.id,
      ),
    );
    return false;
  }

  setItems([productToWishlistItem(product), ...items]);
  return true;
}

export function removeWishlistItem(id: string): void {
  setItems(items.filter((item) => item.id !== id));
}

export function clearWishlistStore(): void {
  setItems([]);
}

export function useWishlist() {
  const wishlistItems = useSyncExternalStore(subscribe, getSnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
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
    persist();
    setFeedback('لیست علاقه‌مندی‌ها ذخیره شد.');
  }, []);

  const clearWishlist = useCallback(() => {
    clearWishlistStore();
  }, []);

  const retry = useCallback(() => {
    setError(false);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 200);
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
