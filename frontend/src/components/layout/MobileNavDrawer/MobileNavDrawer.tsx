import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  Heart,
  Search,
  ShoppingBag,
  Store,
  User,
  X,
} from 'lucide-react';

import { categories } from '../../../pages/Home/data';

import styles from './MobileNavDrawer.module.css';

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  logo: string;
  logoLatin: string;
  cartCount: number;
  wishlistCount: number;
  profileLabel: string;
}

export function MobileNavDrawer({
  open,
  onClose,
  onOpenSearch,
  logo,
  logoLatin,
  cartCount,
  wishlistCount,
  profileLabel,
}: MobileNavDrawerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

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

    return () => {
      window.clearTimeout(focusTimer);
      style.overflow = previousOverflow;
      style.position = previousPosition;
      style.top = previousTop;
      style.width = previousWidth;
      window.scrollTo(0, scrollY);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  const handleSearch = () => {
    onClose();
    onOpenSearch();
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
        onClick={onClose}
        role="presentation"
        aria-hidden={!open}
      />

      <div
        id="mobile-menu"
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className={styles.drawerInner}>
          <header className={styles.drawerHeader}>
            <Link
              to="/"
              className={styles.brand}
              onClick={onClose}
              aria-label={logo}
            >
              <span className={styles.brandFa}>{logo}</span>
              <span className={styles.brandEn} id={titleId}>
                {logoLatin}
              </span>
            </Link>

            <button
              ref={closeRef}
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="بستن منو"
            >
              <X size={22} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </header>

          <div className={styles.scrollRegion}>
            <section
              className={styles.section}
              aria-labelledby="mobile-shop-heading"
            >
              <div className={styles.sectionHead}>
                <h2 id="mobile-shop-heading" className={styles.sectionTitle}>
                  خرید
                </h2>
              </div>

              <Link
                to="/shop"
                className={styles.shopAll}
                onClick={onClose}
              >
                <span className={styles.shopAllIcon} aria-hidden="true">
                  <Store size={18} strokeWidth={1.6} />
                </span>
                <span className={styles.shopAllCopy}>
                  <strong>فروشگاه</strong>
                  <span>مشاهده همه محصولات</span>
                </span>
                <ChevronLeft
                  size={18}
                  strokeWidth={1.6}
                  className={styles.chevron}
                  aria-hidden="true"
                />
              </Link>

              <ul className={styles.categoryGrid}>
                {categories.map((category) => (
                  <li
                    key={category.id}
                    className={
                      category.id === 'accessories'
                        ? styles.categoryWide
                        : undefined
                    }
                  >
                    <Link
                      to={category.href}
                      className={styles.categoryCard}
                      onClick={onClose}
                    >
                      <img
                        src={category.imageSrc}
                        alt=""
                        className={styles.categoryImage}
                        loading="lazy"
                        decoding="async"
                      />
                      <span className={styles.categoryShade} aria-hidden="true" />
                      <span className={styles.categoryMeta}>
                        <span className={styles.categoryName}>
                          {category.name}
                        </span>
                        <ChevronLeft
                          size={16}
                          strokeWidth={1.7}
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section
              className={styles.section}
              aria-labelledby="mobile-actions-heading"
            >
              <h2 id="mobile-actions-heading" className={styles.sectionTitle}>
                دسترسی سریع
              </h2>

              <ul className={styles.quickActions}>
                <li>
                  <button
                    type="button"
                    className={styles.quickAction}
                    onClick={handleSearch}
                  >
                    <span className={styles.quickIcon} aria-hidden="true">
                      <Search size={18} strokeWidth={1.6} />
                    </span>
                    <span>جستجو</span>
                  </button>
                </li>
                <li>
                  <Link
                    to="/wishlist"
                    className={styles.quickAction}
                    onClick={onClose}
                  >
                    <span className={styles.quickIcon} aria-hidden="true">
                      <Heart size={18} strokeWidth={1.6} />
                    </span>
                    <span>علاقه‌مندی‌ها</span>
                    {wishlistCount > 0 ? (
                      <span className={styles.quickCount}>{wishlistCount}</span>
                    ) : null}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cart"
                    className={styles.quickAction}
                    onClick={onClose}
                  >
                    <span className={styles.quickIcon} aria-hidden="true">
                      <ShoppingBag size={18} strokeWidth={1.6} />
                    </span>
                    <span>سبد خرید</span>
                    {cartCount > 0 ? (
                      <span className={styles.quickCount}>{cartCount}</span>
                    ) : null}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/profile"
                    className={styles.quickAction}
                    onClick={onClose}
                  >
                    <span className={styles.quickIcon} aria-hidden="true">
                      <User size={18} strokeWidth={1.6} />
                    </span>
                    <span>{profileLabel}</span>
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
