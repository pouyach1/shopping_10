/**
 * Luxora admin mock data store.
 *
 * Persists a single `luxora-admin-data` blob in localStorage and notifies
 * subscribers after every mutation. UI-independent — no CSS or theme logic.
 */

import type { AdminCategory } from '../types/category';
import type { AdminCustomer } from '../types/customer';
import type {
  BestSellingProduct,
  DashboardStats,
  SalesTrendPoint,
} from '../types/dashboard';
import type { AdminDiscount } from '../types/discount';
import type {
  AdminOrder,
  OrderStatus,
  PaymentStatus,
} from '../types/order';
import type { AdminProduct } from '../types/product';
import type { AdminSettings } from '../types/settings';

import {
  createSeedAdminData,
  type AdminDataState,
} from './mockData';

export const ADMIN_DATA_STORAGE_KEY = 'luxora-admin-data';

const PENDING_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
];

type Listener = () => void;

let state: AdminDataState = loadInitialState();
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function persist(): void {
  try {
    localStorage.setItem(ADMIN_DATA_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable — keep in-memory state only.
  }
}

function setState(next: AdminDataState): void {
  state = next;
  persist();
  emit();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidState(value: unknown): value is AdminDataState {
  if (!isObject(value)) return false;
  return (
    Array.isArray(value.products) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.customers) &&
    Array.isArray(value.orders) &&
    Array.isArray(value.discounts) &&
    isObject(value.settings)
  );
}

function loadInitialState(): AdminDataState {
  try {
    const raw = localStorage.getItem(ADMIN_DATA_STORAGE_KEY);
    if (!raw) {
      const seeded = createSeedAdminData();
      const withStats = withSyncedCustomerStats(seeded);
      localStorage.setItem(ADMIN_DATA_STORAGE_KEY, JSON.stringify(withStats));
      return withStats;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isValidState(parsed)) {
      console.warn(
        '[luxora-admin] Invalid localStorage data — resetting to seed.',
      );
      const seeded = createSeedAdminData();
      const withStats = withSyncedCustomerStats(seeded);
      localStorage.setItem(ADMIN_DATA_STORAGE_KEY, JSON.stringify(withStats));
      return withStats;
    }

    return withSyncedCustomerStats(parsed);
  } catch (error) {
    console.warn(
      '[luxora-admin] Failed to read localStorage — resetting to seed.',
      error,
    );
    return withSyncedCustomerStats(createSeedAdminData());
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function todayKey(): string {
  return dayKey(new Date().toISOString());
}

function isCancelled(order: AdminOrder): boolean {
  return order.orderStatus === 'cancelled';
}

function syncCustomerStats(
  customers: AdminCustomer[],
  orders: AdminOrder[],
): AdminCustomer[] {
  return customers.map((customer) => {
    const customerOrders = orders.filter(
      (order) =>
        order.customerId === customer.id && !isCancelled(order),
    );

    return {
      ...customer,
      orderCount: customerOrders.length,
      totalSpent: customerOrders.reduce((sum, order) => sum + order.total, 0),
    };
  });
}

function withSyncedCustomerStats(data: AdminDataState): AdminDataState {
  return {
    ...data,
    customers: syncCustomerStats(data.customers, data.orders),
  };
}

function cloneState(): AdminDataState {
  return structuredClone(state);
}

// ---------------------------------------------------------------------------
// Subscription API
// ---------------------------------------------------------------------------

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): AdminDataState {
  return state;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== ADMIN_DATA_STORAGE_KEY) return;

    try {
      if (!event.newValue) {
        state = withSyncedCustomerStats(createSeedAdminData());
        emit();
        return;
      }

      const parsed: unknown = JSON.parse(event.newValue);
      if (!isValidState(parsed)) {
        console.warn(
          '[luxora-admin] Ignoring invalid cross-tab localStorage payload.',
        );
        return;
      }

      state = withSyncedCustomerStats(parsed);
      emit();
    } catch (error) {
      console.warn(
        '[luxora-admin] Failed to sync admin data across tabs.',
        error,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export function getProducts(): AdminProduct[] {
  return state.products;
}

export function getProduct(id: string): AdminProduct | undefined {
  return state.products.find((product) => product.id === id);
}

export function createProduct(
  input: Omit<AdminProduct, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  },
): AdminProduct {
  const timestamp = nowIso();
  const product: AdminProduct = {
    ...input,
    id: input.id ?? createId('prod'),
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp,
  };

  const next = cloneState();
  next.products = [product, ...next.products];
  setState(next);
  return product;
}

export function updateProduct(
  id: string,
  updates: Partial<Omit<AdminProduct, 'id' | 'createdAt'>>,
): AdminProduct | undefined {
  const index = state.products.findIndex((product) => product.id === id);
  if (index < 0) return undefined;

  const next = cloneState();
  const current = next.products[index];
  next.products[index] = {
    ...current,
    ...updates,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
  };
  setState(next);
  return next.products[index];
}

/** Soft-delete: archive the product so historical order lines stay intact. */
export function deleteProduct(id: string): AdminProduct | undefined {
  return updateProduct(id, { status: 'archived' });
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function getCategories(): AdminCategory[] {
  return state.categories;
}

export function getCategory(id: string): AdminCategory | undefined {
  return state.categories.find((category) => category.id === id);
}

export function createCategory(
  input: Omit<AdminCategory, 'id' | 'createdAt'> & {
    id?: string;
    createdAt?: string;
  },
): AdminCategory {
  const category: AdminCategory = {
    ...input,
    id: input.id ?? createId('cat'),
    createdAt: input.createdAt ?? nowIso(),
  };

  const next = cloneState();
  next.categories = [category, ...next.categories];
  setState(next);
  return category;
}

export function updateCategory(
  id: string,
  updates: Partial<Omit<AdminCategory, 'id' | 'createdAt'>>,
): AdminCategory | undefined {
  const index = state.categories.findIndex((category) => category.id === id);
  if (index < 0) return undefined;

  const next = cloneState();
  const current = next.categories[index];
  next.categories[index] = {
    ...current,
    ...updates,
    id: current.id,
    createdAt: current.createdAt,
  };
  setState(next);
  return next.categories[index];
}

export function deleteCategory(id: string): boolean {
  const hasProducts = state.products.some(
    (product) =>
      product.categoryId === id && product.status !== 'archived',
  );

  if (hasProducts) {
    return false;
  }

  const next = cloneState();
  const before = next.categories.length;
  next.categories = next.categories.filter((category) => category.id !== id);
  if (next.categories.length === before) return false;

  setState(next);
  return true;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export function getCustomers(): AdminCustomer[] {
  return state.customers;
}

export function getCustomer(id: string): AdminCustomer | undefined {
  return state.customers.find((customer) => customer.id === id);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export function getOrders(): AdminOrder[] {
  return state.orders;
}

export function getOrder(id: string): AdminOrder | undefined {
  return state.orders.find((order) => order.id === id);
}

export function updateOrderStatus(
  id: string,
  orderStatus: OrderStatus,
): AdminOrder | undefined {
  const index = state.orders.findIndex((order) => order.id === id);
  if (index < 0) return undefined;

  const next = cloneState();
  next.orders[index] = {
    ...next.orders[index],
    orderStatus,
    updatedAt: nowIso(),
  };
  setState(withSyncedCustomerStats(next));
  return next.orders[index];
}

export function updatePaymentStatus(
  id: string,
  paymentStatus: PaymentStatus,
): AdminOrder | undefined {
  const index = state.orders.findIndex((order) => order.id === id);
  if (index < 0) return undefined;

  const next = cloneState();
  next.orders[index] = {
    ...next.orders[index],
    paymentStatus,
    updatedAt: nowIso(),
  };
  setState(next);
  return next.orders[index];
}

// ---------------------------------------------------------------------------
// Discounts
// ---------------------------------------------------------------------------

export function getDiscounts(): AdminDiscount[] {
  return state.discounts;
}

export function getDiscount(id: string): AdminDiscount | undefined {
  return state.discounts.find((discount) => discount.id === id);
}

export function createDiscount(
  input: Omit<AdminDiscount, 'id' | 'createdAt'> & {
    id?: string;
    createdAt?: string;
  },
): AdminDiscount {
  const discount: AdminDiscount = {
    ...input,
    id: input.id ?? createId('disc'),
    createdAt: input.createdAt ?? nowIso(),
  };

  const next = cloneState();
  next.discounts = [discount, ...next.discounts];
  setState(next);
  return discount;
}

export function updateDiscount(
  id: string,
  updates: Partial<Omit<AdminDiscount, 'id' | 'createdAt'>>,
): AdminDiscount | undefined {
  const index = state.discounts.findIndex((discount) => discount.id === id);
  if (index < 0) return undefined;

  const next = cloneState();
  const current = next.discounts[index];
  next.discounts[index] = {
    ...current,
    ...updates,
    id: current.id,
    createdAt: current.createdAt,
  };
  setState(next);
  return next.discounts[index];
}

export function deleteDiscount(id: string): boolean {
  const next = cloneState();
  const before = next.discounts.length;
  next.discounts = next.discounts.filter((discount) => discount.id !== id);
  if (next.discounts.length === before) return false;
  setState(next);
  return true;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function getSettings(): AdminSettings {
  return state.settings;
}

export function updateSettings(
  updates: Partial<AdminSettings>,
): AdminSettings {
  const next = cloneState();
  next.settings = {
    ...next.settings,
    ...updates,
    shippingMethods:
      updates.shippingMethods ?? next.settings.shippingMethods,
  };
  setState(next);
  return next.settings;
}

// ---------------------------------------------------------------------------
// Dashboard derived data
// ---------------------------------------------------------------------------

export function getDashboardStats(): DashboardStats {
  const today = todayKey();
  const activeOrders = state.orders.filter((order) => !isCancelled(order));

  const todayOrders = activeOrders.filter(
    (order) => dayKey(order.createdAt) === today,
  );

  return {
    todaySales: todayOrders.reduce((sum, order) => sum + order.total, 0),
    totalOrders: state.orders.length,
    todayOrders: todayOrders.length,
    pendingOrders: state.orders.filter((order) =>
      PENDING_STATUSES.includes(order.orderStatus),
    ).length,
    productCount: state.products.filter(
      (product) => product.status !== 'archived',
    ).length,
    customerCount: state.customers.length,
    lowStockCount: getLowStockProducts().length,
  };
}

export function getRecentOrders(limit = 8): AdminOrder[] {
  return [...state.orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, Math.max(0, limit));
}

export function getLowStockProducts(limit?: number): AdminProduct[] {
  const items = state.products.filter(
    (product) =>
      product.status !== 'archived' &&
      product.stock <= product.lowStockThreshold,
  );

  items.sort((a, b) => a.stock - b.stock);
  return typeof limit === 'number' ? items.slice(0, limit) : items;
}

export function getBestSellingProducts(limit = 5): BestSellingProduct[] {
  const quantities = new Map<string, { quantity: number; revenue: number }>();

  for (const order of state.orders) {
    if (isCancelled(order)) continue;

    for (const item of order.items) {
      const current = quantities.get(item.productId) ?? {
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += item.unitPrice * item.quantity;
      quantities.set(item.productId, current);
    }
  }

  const ranked: BestSellingProduct[] = [];

  for (const [productId, stats] of quantities) {
    const product = getProduct(productId);
    if (!product) continue;
    ranked.push({
      product,
      quantitySold: stats.quantity,
      revenue: stats.revenue,
    });
  }

  ranked.sort((a, b) => b.quantitySold - a.quantitySold);
  return ranked.slice(0, Math.max(0, limit));
}

export function getSalesTrend(days: 7 | 30 = 7): SalesTrendPoint[] {
  const points: SalesTrendPoint[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    const key = dayKey(date.toISOString());

    const dayOrders = state.orders.filter(
      (order) =>
        !isCancelled(order) && dayKey(order.createdAt) === key,
    );

    points.push({
      date: key,
      revenue: dayOrders.reduce((sum, order) => sum + order.total, 0),
      orders: dayOrders.length,
    });
  }

  return points;
}

/** Test helper — resets store to fresh seed data. */
export function resetAdminData(): void {
  setState(withSyncedCustomerStats(createSeedAdminData()));
}

export const adminMockStore = {
  subscribe,
  getSnapshot,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCustomers,
  getCustomer,
  getOrders,
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
  getDiscounts,
  getDiscount,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  getSettings,
  updateSettings,
  getDashboardStats,
  getRecentOrders,
  getLowStockProducts,
  getBestSellingProducts,
  getSalesTrend,
  resetAdminData,
};
