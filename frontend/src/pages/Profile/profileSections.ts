import {
  Heart,
  Package,
  ShoppingBag,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export type ProfileSectionId =
  | 'home'
  | 'orders'
  | 'wishlist'
  | 'cart'
  | 'account';

export const PROFILE_HOME_PATH = '/profile';

export interface ProfileNavItem {
  id: Exclude<ProfileSectionId, 'home'>;
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const PROFILE_NAV: readonly ProfileNavItem[] = [
  {
    id: 'orders',
    to: '/profile/orders',
    title: 'سفارش‌های من',
    description: 'مشاهده و پیگیری سفارش‌ها',
    icon: Package,
  },
  {
    id: 'wishlist',
    to: '/profile/wishlist',
    title: 'علاقه‌مندی‌ها',
    description: 'محصولات ذخیره‌شده',
    icon: Heart,
  },
  {
    id: 'cart',
    to: '/profile/cart',
    title: 'سبد خرید',
    description: 'محصولات آماده‌ی خرید',
    icon: ShoppingBag,
  },
  {
    id: 'account',
    to: '/profile/account',
    title: 'اطلاعات حساب',
    description: 'مشخصات شخصی',
    icon: UserRound,
  },
] as const;

export const PROFILE_TITLES: Record<ProfileSectionId, string> = {
  home: 'پروفایل من',
  orders: 'سفارش‌های من',
  wishlist: 'علاقه‌مندی‌ها',
  cart: 'سبد خرید',
  account: 'اطلاعات حساب',
};

export function getProfileSection(pathname: string): ProfileSectionId {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/profile/orders') return 'orders';
  if (path === '/profile/wishlist') return 'wishlist';
  if (path === '/profile/cart') return 'cart';
  if (path === '/profile/account') return 'account';
  return 'home';
}

export function getProfileDepth(section: ProfileSectionId): number {
  return section === 'home' ? 0 : 1;
}
