import { useEffect, useId, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  LogIn,
  LogOut,
  Package,
  Pencil,
  ShoppingBag,
  UserRound,
} from 'lucide-react';

import { useCart } from '../../../hooks/useCart';
import { useProfileAuth } from '../../../hooks/useProfileAuth';
import { useWishlist } from '../../../hooks/useWishlist';
import {
  formatMemberSince,
  getCustomerOrders,
  toPersianItemCount,
} from '../../../services/customerOrders';

import { ProfileDrawerHeader } from './ProfileDrawerHeader';
import { ProfileNavItem } from './ProfileNavItem';
import { ProfileNavSection } from './ProfileNavSection';
import styles from './MobileProfileDrawer.module.css';

interface MobileProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ل';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

export function MobileProfileDrawer({ open, onClose }: MobileProfileDrawerProps) {
  const titleId = useId();
  const shopHeadingId = useId();
  const accountHeadingId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const historyPushed = useRef(false);

  const navigate = useNavigate();
  const { isAuthenticated, customer, session, logout } = useProfileAuth();
  const { itemCount: cartCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();

  const orders =
    isAuthenticated && customer
      ? getCustomerOrders(customer.id)
      : [];

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const previousOverflow = style.overflow;
    const previousPosition = style.position;
    const previousTop = style.top;
    const previousWidth = style.width;

    style.overflow = 'hidden';
    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.width = '100%';

    const focusTimer = window.setTimeout(() => {
      closeRef.current?.focus();
    }, 40);

    if (window.history.state?.luxoraProfileDrawer !== true) {
      window.history.pushState({ luxoraProfileDrawer: true }, '');
      historyPushed.current = true;
    }

    const onPopState = () => {
      historyPushed.current = false;
      onClose();
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('popstate', onPopState);
      style.overflow = previousOverflow;
      style.position = previousPosition;
      style.top = previousTop;
      style.width = previousWidth;
      window.scrollTo(0, scrollY);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  const handleClose = () => {
    if (historyPushed.current && window.history.state?.luxoraProfileDrawer) {
      historyPushed.current = false;
      window.history.back();
      return;
    }
    onClose();
  };

  /** Close without consuming history — used when navigating to another route. */
  const handleNavigateAway = () => {
    historyPushed.current = false;
    if (window.history.state?.luxoraProfileDrawer) {
      window.history.replaceState(null, '');
    }
    onClose();
  };

  const handleLogout = () => {
    logout();
    handleNavigateAway();
    navigate('/profile');
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
        onClick={handleClose}
        role="presentation"
        aria-hidden={!open}
      />

      <div
        id="mobile-profile-drawer"
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className={styles.drawerInner}>
          <ProfileDrawerHeader
            titleId={titleId}
            title="پروفایل"
            onClose={handleClose}
            closeRef={closeRef}
          >
            {isAuthenticated && customer ? (
              <div className={styles.identity}>
                <div className={styles.avatar} aria-hidden="true">
                  {getInitials(customer.name)}
                </div>
                <div className={styles.identityCopy}>
                  <p className={styles.identityName}>{customer.name}</p>
                  {customer.phone ? (
                    <p className={styles.identityMeta} dir="ltr">
                      {customer.phone}
                    </p>
                  ) : customer.email ? (
                    <p className={styles.identityMeta} dir="ltr">
                      {customer.email}
                    </p>
                  ) : null}
                  <p className={styles.statusPill}>حساب فعال</p>
                </div>
              </div>
            ) : (
              <div className={styles.guestCard}>
                <div className={styles.guestAvatar} aria-hidden="true">
                  <UserRound size={22} strokeWidth={1.5} />
                </div>
                <div className={styles.guestCopy}>
                  <p className={styles.guestTitle}>ورود به حساب لوکسورا</p>
                  <p className={styles.guestLead}>
                    سفارش‌ها، علاقه‌مندی‌ها و خریدهای خود را یکجا مدیریت کنید.
                  </p>
                </div>
              </div>
            )}
          </ProfileDrawerHeader>

          <div className={styles.scrollRegion}>
            {isAuthenticated ? (
              <>
                <ProfileNavSection title="خرید و سفارش" titleId={shopHeadingId}>
                  <ProfileNavItem
                    to="/profile?section=orders"
                    icon={<Package size={18} strokeWidth={1.6} />}
                    label="سفارش‌های من"
                    description={
                      orders.length > 0
                        ? `${toPersianItemCount(orders.length)} سفارش ثبت‌شده`
                        : 'پیگیری وضعیت سفارش‌ها'
                    }
                    count={orders.length}
                    countLabel={toPersianItemCount(orders.length)}
                    onNavigate={handleNavigateAway}
                  />
                  <ProfileNavItem
                    to="/cart"
                    icon={<ShoppingBag size={18} strokeWidth={1.6} />}
                    label="سبد خرید"
                    description={
                      cartCount > 0
                        ? `${toPersianItemCount(cartCount)} کالا آماده خرید`
                        : 'سبد خرید خالی است'
                    }
                    count={cartCount}
                    countLabel={toPersianItemCount(cartCount)}
                    onNavigate={handleNavigateAway}
                  />
                  <ProfileNavItem
                    to="/wishlist"
                    icon={<Heart size={18} strokeWidth={1.6} />}
                    label="علاقه‌مندی‌ها"
                    description={
                      wishlistCount > 0
                        ? `${toPersianItemCount(wishlistCount)} محصول ذخیره‌شده`
                        : 'لیست علاقه‌مندی خالی است'
                    }
                    count={wishlistCount}
                    countLabel={toPersianItemCount(wishlistCount)}
                    onNavigate={handleNavigateAway}
                  />
                </ProfileNavSection>

                <ProfileNavSection
                  title="حساب کاربری"
                  titleId={accountHeadingId}
                >
                  <ProfileNavItem
                    to="/profile"
                    icon={<UserRound size={18} strokeWidth={1.6} />}
                    label="حساب من"
                    description="نمای کلی و مدیریت حساب"
                    onNavigate={handleNavigateAway}
                  />
                  <ProfileNavItem
                    to="/profile?section=account"
                    icon={<Pencil size={18} strokeWidth={1.6} />}
                    label="اطلاعات حساب"
                    description="نام، تماس و آدرس"
                    onNavigate={handleNavigateAway}
                  />
                </ProfileNavSection>

                <div className={styles.logoutBlock}>
                  <ProfileNavItem
                    icon={<LogOut size={18} strokeWidth={1.6} />}
                    label="خروج از حساب"
                    danger
                    onClick={handleLogout}
                  />
                </div>
              </>
            ) : (
              <>
                <div className={styles.loginCtaWrap}>
                  <Link
                    to="/profile"
                    className={styles.loginCta}
                    onClick={handleNavigateAway}
                  >
                    <LogIn size={18} strokeWidth={1.6} aria-hidden="true" />
                    ورود / ثبت‌نام
                  </Link>
                </div>

                <ProfileNavSection title="دسترسی سریع" titleId={shopHeadingId}>
                  <ProfileNavItem
                    to="/cart"
                    icon={<ShoppingBag size={18} strokeWidth={1.6} />}
                    label="سبد خرید"
                    description={
                      cartCount > 0
                        ? `${toPersianItemCount(cartCount)} کالا`
                        : 'سبد خرید خالی است'
                    }
                    count={cartCount}
                    countLabel={toPersianItemCount(cartCount)}
                    onNavigate={handleNavigateAway}
                  />
                  <ProfileNavItem
                    to="/wishlist"
                    icon={<Heart size={18} strokeWidth={1.6} />}
                    label="علاقه‌مندی‌ها"
                    description={
                      wishlistCount > 0
                        ? `${toPersianItemCount(wishlistCount)} محصول`
                        : 'لیست علاقه‌مندی خالی است'
                    }
                    count={wishlistCount}
                    countLabel={toPersianItemCount(wishlistCount)}
                    onNavigate={handleNavigateAway}
                  />
                </ProfileNavSection>
              </>
            )}

            {isAuthenticated && session ? (
              <p className={styles.footerNote}>
                عضو از {formatMemberSince(session.signedInAt)}
              </p>
            ) : (
              <p className={styles.footerNote}>
                لوکسورا — تجربه خرید آرام و ممتاز
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
