import { Bell, Menu, LogOut } from 'lucide-react';

import styles from './AdminHeader.module.css';

interface AdminHeaderProps {
  title: string;
  onMenuClick: () => void;
  onLogout: () => void;
}

export function AdminHeader({ title, onMenuClick, onLogout }: AdminHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.start}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label="باز کردن منو"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>

        <h1 className={styles.title}>{title}</h1>
      </div>

      <div className={styles.end}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="اعلان‌ها"
          title="اعلان‌ها — به‌زودی"
        >
          <Bell size={18} strokeWidth={1.75} />
        </button>

        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden="true">
            ا
          </span>
          <div className={styles.userMeta}>
            <span className={styles.userName}>مدیر فروشگاه</span>
            <span className={styles.userRole}>ادمین</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.logoutButton}
          onClick={onLogout}
          aria-label="خروج"
          data-testid="admin-header-logout"
        >
          <LogOut size={16} strokeWidth={1.75} />
          <span>خروج</span>
        </button>
      </div>
    </header>
  );
}
