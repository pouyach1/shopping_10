/**
 * Phase 1 admin types — session only.
 * Domain entities (Product, Order, etc.) arrive in later phases.
 */

export interface AdminSession {
  authenticated: boolean;
}

export type AdminNavId =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'customers'
  | 'categories'
  | 'discounts'
  | 'settings';

export interface AdminNavItem {
  id: AdminNavId;
  label: string;
  href: string;
}
