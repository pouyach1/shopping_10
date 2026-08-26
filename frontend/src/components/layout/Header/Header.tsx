import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Heart,
  ShoppingBag,
  Menu,
  X,
  User,
  ChevronDown,
  LogOut,
  UserCircle,
} from 'lucide-react';

import type { NavItem } from '../../../pages/Home/types';
import { SearchOverlay } from '../../search/SearchOverlay/SearchOverlay';
import { MobileNavDrawer } from '../MobileNavDrawer';
import { MobileProfileDrawer } from '../MobileProfileDrawer';
import { useCart } from '../../../hooks/useCart';
import { useWishlist } from '../../../hooks/useWishlist';
import { useProfileAuth } from '../../../hooks/useProfileAuth';

import styles from './Header.module.css';

interface HeaderProps {
  navItems: NavItem[];
  onCart?: () => void;
  logo?: string;
  logoLatin?: string;
}

interface MegaMenuItem {
  id: string;
  label: string;
  href: string;
}

interface MegaMenuColumn {
  id: string;
  title: string;
  items: MegaMenuItem[];
}

const megaMenuData: Record<string, MegaMenuColumn[]> = {
  shop: [
    {
      id: 'women',
      title: 'زنانه',
      items: [
        { id: 'w-all', label: 'همه زنانه', href: '/category/women' },
        { id: 'w-shop', label: 'فروشگاه', href: '/shop' },
      ],
    },
    {
      id: 'men',
      title: 'مردانه',
      items: [
        { id: 'm-all', label: 'همه مردانه', href: '/category/men' },
        { id: 'm-shop', label: 'فروشگاه', href: '/shop' },
      ],
    },
    {
      id: 'accessories',
      title: 'اکسسوری',
      items: [
        { id: 'a-bags', label: 'کیف', href: '/category/bags' },
        { id: 'a-shoes', label: 'کفش', href: '/category/shoes' },
        { id: 'a-accessories', label: 'اکسسوری', href: '/category/accessories' },
      ],
    },
  ],
  categories: [
    {
      id: 'clothing',
      title: 'پوشاک',
      items: [
        { id: 'c-women', label: 'زنانه', href: '/category/women' },
        { id: 'c-men', label: 'مردانه', href: '/category/men' },
        { id: 'c-all', label: 'همه فروشگاه', href: '/shop' },
      ],
    },
    {
      id: 'accessories-cat',
      title: 'اکسسوری',
      items: [
        { id: 'o-bags', label: 'کیف', href: '/category/bags' },
        { id: 'o-shoes', label: 'کفش', href: '/category/shoes' },
        { id: 'o-accessories', label: 'اکسسوری', href: '/category/accessories' },
      ],
    },
  ],
};

export function Header({
  navItems,
  onCart,
  logo = 'لوکسورا',
  logoLatin = 'LUXORA',
}: HeaderProps) {
  const navigate = useNavigate();
  const { itemCount: cartCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { isAuthenticated, customer, logout } = useProfileAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(() => {
    return sessionStorage.getItem('luxora-search-open') === 'true';
  });
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState<string | null>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [cartBadgePulse, setCartBadgePulse] = useState(false);
  const prevCartCountRef = useRef(cartCount);
  const megaMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
    setProfileDrawerOpen(false);
    setMegaMenuOpen(null);
    setAccountDropdownOpen(false);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const openProfileDrawer = useCallback(() => {
    setMobileMenuOpen(false);
    setAccountDropdownOpen(false);
    setMegaMenuOpen(null);
    setProfileDrawerOpen(true);
  }, []);

  const closeProfileDrawer = useCallback(() => {
    setProfileDrawerOpen(false);
  }, []);

  const openSearch = useCallback(() => {
    sessionStorage.setItem('luxora-search-open', 'true');
    setProfileDrawerOpen(false);
    setMobileMenuOpen(false);
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    sessionStorage.removeItem('luxora-search-open');
    setSearchOpen(false);
  }, []);

  const handleMegaMenuEnter = useCallback((menuId: string) => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current);
    }
    setMegaMenuOpen(menuId);
  }, []);

  const handleMegaMenuLeave = useCallback(() => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current);
    }
    megaMenuTimeoutRef.current = setTimeout(() => {
      setMegaMenuOpen(null);
    }, 150);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (searchOpen) closeSearch();
      if (profileDrawerOpen) closeProfileDrawer();
      if (mobileMenuOpen) closeMobileMenu();
      if (accountDropdownOpen) setAccountDropdownOpen(false);
      if (megaMenuOpen) setMegaMenuOpen(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [
    searchOpen,
    mobileMenuOpen,
    profileDrawerOpen,
    accountDropdownOpen,
    megaMenuOpen,
    closeSearch,
    closeMobileMenu,
    closeProfileDrawer,
  ]);

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 80);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (cartCount === prevCartCountRef.current) return;
    prevCartCountRef.current = cartCount;
    if (cartCount <= 0) return;
    setCartBadgePulse(true);
    const timer = window.setTimeout(() => setCartBadgePulse(false), 420);
    return () => window.clearTimeout(timer);
  }, [cartCount]);

  useEffect(() => {
    return () => {
      if (megaMenuTimeoutRef.current) {
        clearTimeout(megaMenuTimeoutRef.current);
      }
    };
  }, []);

  const hasMegaMenu = (itemId: string): boolean =>
    itemId === 'shop' || itemId === 'categories';

  return (
    <>
      <header className={`${styles.header} ${isSticky ? styles.sticky : ''}`}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo} aria-label={logo}>
            <span className={styles.logoText}>{logo}</span>
            <span className={styles.logoLatin}>{logoLatin}</span>
          </Link>

          <nav className={styles.desktopNav} aria-label="منوی اصلی">
            <ul className={styles.navList}>
              {navItems.map((item) => (
                <li
                  key={item.id}
                  className={styles.navItem}
                  onMouseEnter={() =>
                    hasMegaMenu(item.id)
                      ? handleMegaMenuEnter(item.id)
                      : undefined
                  }
                  onMouseLeave={() =>
                    hasMegaMenu(item.id) ? handleMegaMenuLeave() : undefined
                  }
                >
                  <Link to={item.href} className={styles.navLink}>
                    {item.label}
                    {hasMegaMenu(item.id) ? (
                      <ChevronDown
                        size={14}
                        strokeWidth={1.5}
                        className={styles.chevron}
                        aria-hidden="true"
                      />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={openSearch}
              aria-label="جستجو"
            >
              <Search size={20} strokeWidth={1.5} />
            </button>

            <Link
              to="/wishlist"
              className={`${styles.iconButton} ${styles.hideOnMobile}`}
              aria-label={
                wishlistCount > 0
                  ? `علاقه‌مندی‌ها، ${wishlistCount} مورد`
                  : 'علاقه‌مندی‌ها'
              }
            >
              <Heart size={20} strokeWidth={1.5} />
              {wishlistCount > 0 ? (
                <span className={styles.countBadge}>{wishlistCount}</span>
              ) : null}
            </Link>

            <Link
              to="/cart"
              className={styles.iconButton}
              aria-label={
                cartCount > 0 ? `سبد خرید، ${cartCount} کالا` : 'سبد خرید'
              }
              onClick={() => onCart?.()}
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartCount > 0 ? (
                <span
                  className={`${styles.countBadge} ${
                    cartBadgePulse ? styles.countBadgePulse : ''
                  }`}
                >
                  {cartCount}
                </span>
              ) : null}
            </Link>

            <button
              type="button"
              className={`${styles.iconButton} ${styles.mobileProfileButton}`}
              onClick={openProfileDrawer}
              aria-label={
                isAuthenticated
                  ? customer?.name
                    ? `حساب کاربری، ${customer.name}`
                    : 'حساب کاربری'
                  : 'ورود / پروفایل'
              }
              aria-expanded={profileDrawerOpen}
              aria-controls="mobile-profile-drawer"
            >
              <User size={20} strokeWidth={1.5} />
            </button>

            <div className={`${styles.accountWrap} ${styles.hideOnMobile}`}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setAccountDropdownOpen((open) => !open)}
                aria-label="حساب کاربری"
                aria-expanded={accountDropdownOpen}
              >
                <User size={20} strokeWidth={1.5} />
              </button>
              {accountDropdownOpen ? (
                <div className={styles.accountDropdown}>
                  <Link
                    to="/profile"
                    className={styles.dropdownItem}
                    onClick={() => setAccountDropdownOpen(false)}
                  >
                    <UserCircle size={16} strokeWidth={1.5} />
                    {isAuthenticated
                      ? customer?.name || 'پروفایل'
                      : 'ورود / پروفایل'}
                  </Link>
                  {isAuthenticated ? (
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        logout();
                        navigate('/profile');
                      }}
                    >
                      <LogOut size={16} strokeWidth={1.5} />
                      خروج
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className={styles.menuToggle}
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? (
                <X size={24} strokeWidth={1.5} />
              ) : (
                <Menu size={24} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {megaMenuOpen && megaMenuData[megaMenuOpen] ? (
          <div
            className={styles.megaMenu}
            onMouseEnter={() => handleMegaMenuEnter(megaMenuOpen)}
            onMouseLeave={handleMegaMenuLeave}
          >
            <div className={styles.megaMenuInner}>
              {megaMenuData[megaMenuOpen].map((column) => (
                <div key={column.id} className={styles.megaMenuColumn}>
                  <h3 className={styles.megaMenuTitle}>{column.title}</h3>
                  <ul className={styles.megaMenuList}>
                    {column.items.map((item) => (
                      <li key={item.id}>
                        <Link to={item.href} className={styles.megaMenuLink}>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <MobileNavDrawer
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        onOpenSearch={openSearch}
        onOpenProfile={openProfileDrawer}
        logo={logo}
        logoLatin={logoLatin}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        profileLabel={
          isAuthenticated
            ? customer?.name
              ? `حساب (${customer.name})`
              : 'حساب کاربری'
            : 'ورود / پروفایل'
        }
      />

      <MobileProfileDrawer
        open={profileDrawerOpen}
        onClose={closeProfileDrawer}
      />

      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </>
  );
}
