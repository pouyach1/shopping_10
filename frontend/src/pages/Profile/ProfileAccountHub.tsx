import { LogOut } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useCart } from '../../hooks/useCart';
import { useProfileAuth } from '../../hooks/useProfileAuth';
import { useWishlist } from '../../hooks/useWishlist';
import {
  formatMemberSince,
  getCustomerOrders,
  toPersianItemCount,
} from '../../services/customerOrders';

import { ProfileNavigationItem } from './ProfileNavigationItem';
import { ProfileSectionHeader } from './ProfileSectionHeader';
import {
  PROFILE_NAV,
  getProfileDepth,
  getProfileSection,
} from './profileSections';

import styles from './ProfileAccountHub.module.css';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ل';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

export function ProfileAccountHub() {
  const { customer, session, logout } = useProfileAuth();
  const { itemCount: wishlistCount } = useWishlist();
  const { itemCount: cartCount } = useCart();
  const location = useLocation();
  const section = getProfileSection(location.pathname);
  const prevPathRef = useRef(location.pathname);
  const [motion, setMotion] = useState<'idle' | 'deeper' | 'back'>('idle');

  useLayoutEffect(() => {
    const previous = prevPathRef.current;
    if (previous === location.pathname) return;
    const prevDepth = getProfileDepth(getProfileSection(previous));
    const nextDepth = getProfileDepth(getProfileSection(location.pathname));
    setMotion(nextDepth < prevDepth ? 'back' : 'deeper');
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  if (!customer || !session) return null;

  const orders = getCustomerOrders(customer.id);
  const memberSince = formatMemberSince(session.signedInAt);
  const contact = customer.phone ?? customer.email ?? customer.identifier;
  const motionClass =
    motion === 'idle'
      ? ''
      : motion === 'back'
        ? styles.enterBack
        : styles.enterDeeper;

  const countFor = (id: (typeof PROFILE_NAV)[number]['id']): number | undefined => {
    if (id === 'orders') return orders.length;
    if (id === 'wishlist') return wishlistCount;
    if (id === 'cart') return cartCount;
    return undefined;
  };

  const descriptionFor = (
    id: (typeof PROFILE_NAV)[number]['id'],
    fallback: string,
  ): string => {
    if (id === 'orders') {
      return orders.length > 0
        ? `${toPersianItemCount(orders.length)} سفارش`
        : 'هنوز سفارشی ثبت نشده';
    }
    if (id === 'wishlist') {
      return wishlistCount > 0
        ? `${toPersianItemCount(wishlistCount)} محصول ذخیره شده`
        : 'لیست علاقه‌مندی خالی است';
    }
    if (id === 'cart') {
      return cartCount > 0
        ? `${toPersianItemCount(cartCount)} محصول آماده خرید`
        : 'سبد خرید خالی است';
    }
    return fallback;
  };

  return (
    <div
      className={styles.hub}
      data-section={section}
      data-motion={motion}
    >
      <aside className={styles.sidebar}>
        <h1 className={styles.mobilePageTitle}>پروفایل من</h1>

        <header className={styles.identityCard}>
          <div className={styles.avatar} aria-hidden="true">
            {getInitials(customer.name)}
          </div>
          <div className={styles.identityCopy}>
            <p className={styles.identityEyebrow}>حساب کاربری</p>
            <p className={styles.identityName}>{customer.name}</p>
            <p className={styles.identityContact} dir="ltr">
              {contact}
            </p>
            {customer.email && customer.phone ? (
              <p className={styles.identitySecondary} dir="ltr">
                {customer.email}
              </p>
            ) : null}
            <div className={styles.identityMeta}>
              <span className={styles.statusPill}>حساب فعال</span>
              {memberSince ? (
                <span className={styles.memberSince}>عضویت از {memberSince}</span>
              ) : null}
            </div>
          </div>
        </header>

        <nav className={styles.sideNav} aria-label="بخش‌های حساب">
          {PROFILE_NAV.map((item) => (
            <ProfileNavigationItem
              key={item.id}
              to={item.to}
              title={item.title}
              description={descriptionFor(item.id, item.description)}
              icon={item.icon}
              count={countFor(item.id)}
            />
          ))}
        </nav>

        <button type="button" className={styles.logoutButton} onClick={logout}>
          <LogOut size={17} strokeWidth={1.6} aria-hidden="true" />
          خروج از حساب
        </button>
      </aside>

      <div className={styles.pane}>
        <ProfileSectionHeader section={section} />
        <div key={location.pathname} className={`${styles.sectionStage} ${motionClass}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
