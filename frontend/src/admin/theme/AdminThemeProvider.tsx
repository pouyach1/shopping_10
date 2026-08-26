import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Outlet } from 'react-router-dom';

import {
  persistAdminTheme,
  resolveInitialAdminTheme,
  type AdminTheme,
} from './adminTheme';

import './adminTokens.css';

export interface AdminThemeContextValue {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

interface AdminThemeProviderProps {
  children?: ReactNode;
}

export function AdminThemeProvider({ children }: AdminThemeProviderProps) {
  const [theme, setThemeState] = useState<AdminTheme>(() =>
    resolveInitialAdminTheme(),
  );

  const setTheme = useCallback((next: AdminTheme) => {
    setThemeState(next);
    persistAdminTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: AdminTheme = current === 'light' ? 'dark' : 'light';
      persistAdminTheme(next);
      return next;
    });
  }, []);

  const value = useMemo<AdminThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === 'dark',
    }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <div data-admin-root="" data-theme={theme}>
        {children ?? <Outlet />}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeContextValue {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme must be used within AdminThemeProvider');
  }
  return context;
}
