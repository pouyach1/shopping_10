/**
 * Minimal admin session helpers (localStorage).
 * Future mock product/order data will live alongside this store.
 */

import type { AdminSession } from '../types/admin';

export const ADMIN_AUTH_STORAGE_KEY = 'luxora-admin-authenticated';

export function readAdminSession(): AdminSession {
  try {
    return {
      authenticated: localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true',
    };
  } catch {
    return { authenticated: false };
  }
}

export function writeAdminSession(authenticated: boolean): void {
  try {
    if (authenticated) {
      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable — session stays in-memory via the auth hook.
  }
}
