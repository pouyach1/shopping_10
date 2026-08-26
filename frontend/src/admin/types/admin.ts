/**
 * Admin shell types (session + navigation).
 * Domain entities live in sibling type modules under `admin/types/`.
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
