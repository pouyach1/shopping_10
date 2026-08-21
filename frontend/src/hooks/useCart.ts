import { useMemo, useSyncExternalStore } from 'react';
import { CART_STORAGE_KEY, type CartItem } from '../types/cart';

/**
 * Single source of truth for the shopping cart.
 *
 * State lives in a module-level store that is persisted to localStorage and
 * exposed to React via useSyncExternalStore, so every component that calls
 * useCart() reads and mutates the same cart. No external state library and no
 * provider wrapper are required.
 */

let items: CartItem[] = loadInitial();
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
    name: typeof item.name === 'string' ? item.name : '',
    price: typeof item.price === 'number' ? item.price : 0,
    currency: typeof item.currency === 'string' ? item.currency : '',
    size: typeof item.size === 'string' ? item.size : '',
    color: typeof item.color === 'string' ? item.color : undefined,
    colorValue: typeof item.colorValue === 'string' ? item.colorValue : undefined,
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

function persist(): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items }));
  } catch {
    // Storage unavailable — keep in-memory state only.
  }
}

function setItems(next: CartItem[]): void {
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

function getSnapshot(): CartItem[] {
  return items;
}

if (typeof window !== 'undefined') {
  // Keep other tabs in sync.
  window.addEventListener('storage', (event) => {
    if (event.key === CART_STORAGE_KEY) {
      items = loadInitial();
      listeners.forEach((listener) => listener());
    }
  });
}

export function addItem(item: CartItem): void {
  const quantity = validQuantity(item.quantity);
  const index = items.findIndex((existing) => existing.id === item.id);

  if (index >= 0) {
    const next = items.slice();
    const current = next[index];
    next[index] = { ...current, quantity: current.quantity + quantity };
    setItems(next);
    return;
  }

  setItems([...items, { ...item, quantity }]);
}

export function removeItem(id: string): void {
  setItems(items.filter((item) => item.id !== id));
}

export function updateQuantity(id: string, quantity: number): void {
  const next = validQuantity(quantity);
  setItems(items.map((item) => (item.id === id ? { ...item, quantity: next } : item)));
}

export function clearCart(): void {
  setItems([]);
}

export function useCart() {
  const cartItems = useSyncExternalStore(subscribe, getSnapshot);

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
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
}
