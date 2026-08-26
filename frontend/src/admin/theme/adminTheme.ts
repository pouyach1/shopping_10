export type AdminTheme = 'light' | 'dark';

export const ADMIN_THEME_STORAGE_KEY = 'luxora-admin-theme';

export const ADMIN_THEMES = ['light', 'dark'] as const;

export function isAdminTheme(value: unknown): value is AdminTheme {
  return value === 'light' || value === 'dark';
}

/** Resolve initial theme: saved preference → system preference → light. */
export function resolveInitialAdminTheme(): AdminTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  try {
    const saved = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    if (isAdminTheme(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage failures.
  }

  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Ignore matchMedia failures.
  }

  return 'light';
}

export function persistAdminTheme(theme: AdminTheme): void {
  try {
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures.
  }
}

export function getThemeToggleLabel(theme: AdminTheme): string {
  return theme === 'light' ? 'حالت تاریک' : 'حالت روشن';
}
