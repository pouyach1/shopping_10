/**
 * Storefront API configuration.
 * When VITE_API_BASE_URL is unset, guest LocalStorage commerce remains the default.
 */
export const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ?? '',
).replace(/\/$/, '');

export function isApiEnabled(): boolean {
  return API_BASE_URL.length > 0;
}

export const ACCESS_TOKEN_KEY = 'luxora-access-token';
