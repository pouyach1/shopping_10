import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Tags,
  Percent,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

import { ADMIN_NAV_ITEMS } from '../../data/navItems';
import type { AdminNavId } from '../../types/admin';

import styles from './AdminSidebar.module.css';

const NAV_ICONS: Record<AdminNavId, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  products: Package,
  orders: ShoppingBag,
  customers: Users,
  categories: Tags,
  discounts: Percent,
  settings: Settings,
};

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function AdminSidebar({ open, onClose, onLogout }: AdminSidebarProps) {
  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropVisible : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}
        aria-label="منوی پنل مدیریت"
      >
        <div className={styles.brandRow}>
          <Link to="/admin" className={styles.brand} onClick={onClose}>
            <span className={styles.brandMark}>LUXORA</span>
            <span className={styles.brandSub}>پنل مدیریت</span>
          </Link>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="بستن منو"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <nav className={styles.nav}>
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.id];
            const end = item.href === '/admin';

            return (
              <NavLink
                key={item.id}
                to={item.href}
                end={end}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
                onClick={onClose}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={onLogout}
            data-testid="admin-sidebar-logout"
          >
            <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>خروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
