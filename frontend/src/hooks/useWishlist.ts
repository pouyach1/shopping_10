import { useCallback, useEffect, useState } from 'react';
import type { WishlistItem } from '../pages/Wishlist/types';
import { WISHLIST_STORAGE_KEY, CART_STORAGE_KEY } from '../pages/Wishlist/types';
import { mockWishlistItems } from '../pages/Wishlist/data';

interface CartState {
  items: WishlistItem[];
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
    const cart = loadFromStorage<CartState>(CART_STORAGE_KEY, { items: [] });
    const exists = cart.items.some((cartItem) => cartItem.id === item.id);
    if (!exists) {
      cart.items.push({ ...item });
      saveToStorage(CART_STORAGE_KEY, cart);
    }
  }, []);

  const addAllToCart = useCallback(
    (allItems: WishlistItem[]) => {
      const cart = loadFromStorage<CartState>(CART_STORAGE_KEY, { items: [] });
      allItems.forEach((item) => {
        if (!cart.items.some((cartItem) => cartItem.id === item.id)) {
          cart.items.push({ ...item });
        }
      });
      saveToStorage(CART_STORAGE_KEY, cart);
    },
    [],
  );

  const updateWishlist = useCallback(() => {
    saveToStorage(WISHLIST_STORAGE_KEY, items);
    setFeedback('Wishlist updated');
  }, [items]);

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
    retry,
  };
}
