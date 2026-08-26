import { Moon, Sun } from 'lucide-react';

import { getThemeToggleLabel, useAdminTheme } from '../../theme';

import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useAdminTheme();
  const label = getThemeToggleLabel(theme);

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      data-testid="admin-theme-toggle"
    >
      <span className={styles.icon} aria-hidden="true" data-theme={theme}>
        {isDark ? (
          <Sun size={18} strokeWidth={1.75} />
        ) : (
          <Moon size={18} strokeWidth={1.75} />
        )}
      </span>
    </button>
  );
}
