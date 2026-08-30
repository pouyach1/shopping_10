import { useMemo, useSyncExternalStore } from 'react';

import { CART_STORAGE_KEY, type CartItem } from '../types/cart';
import {
  addCartItem,
  cartLineToCartItem,
  clearRemoteCart,
  fetchCart,
  removeCartItem,
  updateCartItem,
} from '../services/api/cartApi';
import { resolveBackendProductId } from '../services/api/catalogApi';
import {
  ApiError,
  isAuthenticatedForApi,
  isMongoObjectId,
} from '../services/api/http';
import { registerCartBridge } from '../services/commerceSync';

/**
 * Single source of truth for the shopping cart.
 *
 * Guest → LocalStorage.
 * Authenticated + API → backend cart (optimistic local mirror + rollback).
 */

let items: CartItem[] = loadInitial();
let lastError: string | null = null;
const listeners = new Set<() => void>();

function validQuantity(quantity: unknown): number {
  const parsed = Math.floor(Number(quantity));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalize(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<CartItem>;
  if (typeof item.id !== 'string') return null;

  return {
    id: item.id,
    productId: typeof item.productId === 'string' ? item.productId : item.id,
    slug: typeof item.slug === 'string' ? item.slug : undefined,
    name: typeof item.name === 'string' ? item.name : '',
    price: typeof item.price === 'number' ? item.price : 0,
    currency: typeof item.currency === 'string' ? item.currency : '',
    size: typeof item.size === 'string' ? item.size : '',
    color: typeof item.color === 'string' ? item.color : undefined,
    colorValue:
      typeof item.colorValue === 'string' ? item.colorValue : undefined,
    imageSrc: typeof item.imageSrc === 'string' ? item.imageSrc : '',
    imageAlt: typeof item.imageAlt === 'string' ? item.imageAlt : '',
    quantity: validQuantity(item.quantity),
  };
}

function loadInitial(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as { items?: unknown };
    const stored = Array.isArray(data?.items) ? data.items : [];
    return stored
      .map(normalize)
      .filter((item): item is CartItem => item !== null);
  } catch {
    return [];
  }
}

function persistGuest(): void {
  if (isAuthenticatedForApi()) return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items }));
  } catch {
    // Storage unavailable — keep in-memory state only.
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function setItems(next: CartItem[], options?: { persist?: boolean }): void {
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

function getSnapshot(): CartItem[] {
  return items;
}

function getErrorSnapshot(): string | null {
  return lastError;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === CART_STORAGE_KEY && !isAuthenticatedForApi()) {
      items = loadInitial();
      emit();
    }
  });
}

function applyServerCart(serverItems: CartItem[]): void {
  setItems(serverItems, { persist: false });
}

registerCartBridge({
  hydrate: (next) => applyServerCart(next),
  readLocal: () => items.slice(),
});

async function resolveProductId(item: CartItem): Promise<string | null> {
  if (isMongoObjectId(item.productId)) return item.productId;
  return resolveBackendProductId({
    id: item.productId,
    href: item.slug ? `/product/${item.slug}` : undefined,
  });
}

function mergeLocalAdd(list: CartItem[], item: CartItem): CartItem[] {
  const quantity = validQuantity(item.quantity);
  const index = list.findIndex((existing) => existing.id === item.id);
  if (index >= 0) {
    const next = list.slice();
    const current = next[index]!;
    next[index] = { ...current, quantity: current.quantity + quantity };
    return next;
  }
  return [...list, { ...item, quantity }];
}

export function addItem(item: CartItem): void {
  const quantity = validQuantity(item.quantity);
  const prepared = { ...item, quantity };
  const previous = items.slice();
  setItems(mergeLocalAdd(items, prepared));
  setError(null);

  if (!isAuthenticatedForApi()) return;

  void (async () => {
    try {
      const productId = await resolveProductId(prepared);
      if (!productId) {
        setItems(previous, { persist: false });
        setError('این محصول هنوز به کاتالوگ سرور متصل نشده است.');
        return;
      }

      const cart = await addCartItem({
        productId,
        quantity,
        size: prepared.size,
        color: prepared.color,
        colorValue: prepared.colorValue,
      });
      applyServerCart(cart.items.map(cartLineToCartItem));
    } catch (error) {
      setItems(previous, { persist: false });
      setError(
        error instanceof ApiError
          ? error.message
          : 'افزودن به سبد انجام نشد.',
      );
    }
  })();
}

export function removeItem(id: string): void {
  const previous = items.slice();
  const target = items.find((item) => item.id === id);
  setItems(items.filter((item) => item.id !== id));
  setError(null);

  if (!isAuthenticatedForApi() || !target) return;

  void (async () => {
    try {
      const productId = isMongoObjectId(target.productId)
        ? target.productId
        : await resolveProductId(target);
      if (!productId) return;
      const cart = await removeCartItem(productId, {
        size: target.size,
        color: target.color,
      });
      applyServerCart(cart.items.map(cartLineToCartItem));
    } catch (error) {
      setItems(previous, { persist: false });
      setError(
        error instanceof ApiError ? error.message : 'حذف از سبد انجام نشد.',
      );
    }
  })();
}

export function updateQuantity(id: string, quantity: number): void {
  const nextQty = validQuantity(quantity);
  const previous = items.slice();
  const target = items.find((item) => item.id === id);
  setItems(
    items.map((item) =>
      item.id === id ? { ...item, quantity: nextQty } : item,
    ),
  );
  setError(null);

  if (!isAuthenticatedForApi() || !target) return;

  void (async () => {
    try {
      const productId = isMongoObjectId(target.productId)
        ? target.productId
        : await resolveProductId(target);
      if (!productId) {
        setItems(previous, { persist: false });
        setError('این محصول هنوز به کاتالوگ سرور متصل نشده است.');
        return;
      }
      const cart = await updateCartItem(productId, {
        quantity: nextQty,
        size: target.size,
        color: target.color,
      });
      applyServerCart(cart.items.map(cartLineToCartItem));
    } catch (error) {
      setItems(previous, { persist: false });
      setError(
        error instanceof ApiError
          ? error.message
          : 'به‌روزرسانی تعداد انجام نشد.',
      );
    }
  })();
}

export function clearCart(): void {
  const previous = items.slice();
  setItems([]);
  setError(null);

  if (!isAuthenticatedForApi()) return;

  void (async () => {
    try {
      const cart = await clearRemoteCart();
      applyServerCart(cart.items.map(cartLineToCartItem));
    } catch (error) {
      setItems(previous, { persist: false });
      setError(
        error instanceof ApiError ? error.message : 'خالی کردن سبد انجام نشد.',
      );
    }
  })();
}

export async function syncCartFromServer(): Promise<void> {
  if (!isAuthenticatedForApi()) return;
  const cart = await fetchCart();
  applyServerCart(cart.items.map(cartLineToCartItem));
}

export function useCart() {
  const cartItems = useSyncExternalStore(subscribe, getSnapshot);
  const error = useSyncExternalStore(subscribe, getErrorSnapshot);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const itemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  return {
    items: cartItems,
    itemCount,
    subtotal,
    error,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
}
