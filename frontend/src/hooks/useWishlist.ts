import { useCallback, useEffect, useState } from 'react';
import type { WishlistItem } from '../types/user';
import { WISHLIST_STORAGE_KEY } from '../types/user';
import type { CartItem } from '../types/cart';
import { addItem as addItemToCart } from './useCart';
import { mockWishlistItems } from '../pages/Wishlist/data';

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

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable
  }
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>(() =>
    loadFromStorage(WISHLIST_STORAGE_KEY, mockWishlistItems),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveToStorage(WISHLIST_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const updateItemSize = useCallback((id: string, size: string) => {
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, size } : item,
      );
      saveToStorage(WISHLIST_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const updateItemComment = useCallback((id: string, comment: string) => {
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, comment } : item,
      );
      saveToStorage(WISHLIST_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const addToCart = useCallback((item: WishlistItem) => {
    addItemToCart(toCartItem(item));
  }, []);

  const addAllToCart = useCallback((allItems: WishlistItem[]) => {
    allItems.forEach((item) => addItemToCart(toCartItem(item)));
  }, []);

  const updateWishlist = useCallback(() => {
    saveToStorage(WISHLIST_STORAGE_KEY, items);
    setFeedback('Wishlist updated');
  }, [items]);

  const clearWishlist = useCallback(() => {
    setItems([]);
    saveToStorage(WISHLIST_STORAGE_KEY, []);
  }, []);

  const retry = useCallback(() => {
    setError(false);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  return {
    items,
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
  };
}
