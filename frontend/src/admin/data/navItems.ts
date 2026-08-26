import type { AdminNavItem } from '../types/admin';

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'dashboard', label: 'داشبورد', href: '/admin' },
  { id: 'products', label: 'محصولات', href: '/admin/products' },
  { id: 'orders', label: 'سفارش‌ها', href: '/admin/orders' },
  { id: 'customers', label: 'مشتریان', href: '/admin/customers' },
  { id: 'categories', label: 'دسته‌بندی‌ها', href: '/admin/categories' },
  { id: 'discounts', label: 'تخفیف‌ها', href: '/admin/discounts' },
  { id: 'settings', label: 'تنظیمات', href: '/admin/settings' },
];

export const ADMIN_PAGE_TITLES: Record<string, string> = {
  '/admin': 'داشبورد',
  '/admin/products': 'محصولات',
  '/admin/orders': 'سفارش‌ها',
  '/admin/customers': 'مشتریان',
  '/admin/categories': 'دسته‌بندی‌ها',
  '/admin/discounts': 'تخفیف‌ها',
  '/admin/settings': 'تنظیمات',
};

export function getAdminPageTitle(pathname: string): string {
  if (ADMIN_PAGE_TITLES[pathname]) {
    return ADMIN_PAGE_TITLES[pathname];
  }

  const match = ADMIN_NAV_ITEMS.find(
    (item) => item.href !== '/admin' && pathname.startsWith(item.href),
  );

  return match?.label ?? 'پنل مدیریت';
}
