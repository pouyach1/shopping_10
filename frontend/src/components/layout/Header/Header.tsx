import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Heart, ShoppingBag, Menu, X, User, ChevronDown, LogOut, Package, UserCircle } from 'lucide-react';
import type { NavItem } from '../../../pages/Home/types';
import { SearchOverlay } from '../../search/SearchOverlay/SearchOverlay';
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

/* Mega links only use routes that exist in App.tsx:
   /shop, /category/:slug (women|men|bags|shoes|accessories) */
const megaMenuData: Record<string, MegaMenuColumn[]> = {
  shop: [
    {
      id: 'women',
      title: 'زنانه',
      items: [
        { id: 'w-dresses', label: 'پیراهن', href: '/category/women' },
        { id: 'w-tops', label: 'بالاتنه', href: '/category/women' },
        { id: 'w-pants', label: 'شلوار', href: '/category/women' },
        { id: 'w-outerwear', label: 'پالتو و کت', href: '/category/women' },
      ],
    },
    {
      id: 'men',
      title: 'مردانه',
      items: [
        { id: 'm-shirts', label: 'پیراهن', href: '/category/men' },
        { id: 'm-trousers', label: 'شلوار', href: '/category/men' },
        { id: 'm-jackets', label: 'کاپشن', href: '/category/men' },
      ],
    },
    {
      id: 'accessories',
      title: 'اکسسوری',
      items: [
        { id: 'a-bags', label: 'کیف', href: '/category/bags' },
        { id: 'a-belts', label: 'کمربند', href: '/category/accessories' },
        { id: 'a-scarves', label: 'شال و روسری', href: '/category/accessories' },
      ],
    },
    {
      id: 'new',
      title: 'جدیدها',
      items: [
        { id: 'n-new-arrivals', label: 'تازه‌واردها', href: '/shop' },
        { id: 'n-bestsellers', label: 'پرفروش‌ها', href: '/shop' },
        { id: 'n-limited', label: 'نسخه محدود', href: '/shop' },
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
    {
      id: 'collections',
      title: 'مجموعه‌ها',
      items: [
        { id: 'col-shop', label: 'فروشگاه', href: '/shop' },
        { id: 'col-women', label: 'زنانه', href: '/category/women' },
        { id: 'col-men', label: 'مردانه', href: '/category/men' },
        { id: 'col-bags', label: 'کیف‌ها', href: '/category/bags' },
      ],
    },
  ],
};

export function Header({ navItems, onCart, logo = 'لوکسورا', logoLatin = 'LUXORA' }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(() => {
    return sessionStorage.getItem('luxora-search-open') === 'true';
  });
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState<string | null>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const megaMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
    setMegaMenuOpen(null);
    setAccountDropdownOpen(false);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const openSearch = useCallback(() => {
    sessionStorage.setItem('luxora-search-open', 'true');
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    sessionStorage.removeItem('luxora-search-open');
    setSearchOpen(false);
  }, []);

  const toggleAccountDropdown = useCallback(() => {
    setAccountDropdownOpen((prev) => !prev);
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
      if (e.key === 'Escape') {
        if (searchOpen) {
          closeSearch();
        }
        if (mobileMenuOpen) {
          closeMobileMenu();
        }
        if (accountDropdownOpen) {
          setAccountDropdownOpen(false);
        }
        if (megaMenuOpen) {
          setMegaMenuOpen(null);
        }
      }
    };
    if (searchOpen || mobileMenuOpen || accountDropdownOpen || megaMenuOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [searchOpen, mobileMenuOpen, accountDropdownOpen, megaMenuOpen, closeSearch, closeMobileMenu]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsSticky(scrollY > 80);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (megaMenuTimeoutRef.current) {
        clearTimeout(megaMenuTimeoutRef.current);
      }
    };
  }, []);

  const handleWishlistClick = useCallback(() => {
    window.location.href = '/wishlist';
  }, []);

  const handleCartClick = useCallback(() => {
    window.location.href = '/cart';
    if (onCart) {
      onCart();
    }
  }, [onCart]);

  const handleAccountClick = useCallback(() => {
    if (isLoggedIn) {
      toggleAccountDropdown();
    } else {
      window.location.href = '/login';
    }
  }, [isLoggedIn, toggleAccountDropdown]);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setAccountDropdownOpen(false);
    window.location.href = '/';
  }, []);

  const hasMegaMenu = (itemId: string): boolean => {
    return itemId === 'shop' || itemId === 'categories';
  };

  return (
    <>
      <header
        className={`${styles.header} ${isSticky ? styles.sticky : ''}`}
      >
        <div className={styles.headerInner}>
          <a href="/" className={styles.logo} aria-label={logo}>
            <span className={styles.logoText}>{logo}</span>
            <span className={styles.logoLatin}>{logoLatin}</span>
          </a>

          <nav className={styles.desktopNav} aria-label="منوی اصلی">
            <ul className={styles.navList}>
              {navItems.map((item) => (
                <li
                  key={item.id}
                  className={styles.navItem}
                  onMouseEnter={() => hasMegaMenu(item.id) ? handleMegaMenuEnter(item.id) : undefined}
                  onMouseLeave={() => hasMegaMenu(item.id) ? handleMegaMenuLeave() : undefined}
                >
                  <a href={item.href} className={styles.navLink}>
                    {item.label}
                    {hasMegaMenu(item.id) && (
                      <ChevronDown size={14} strokeWidth={1.5} className={styles.chevron} aria-hidden="true" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <button className={styles.iconButton} onClick={openSearch} aria-label="جستجو">
              <Search size={20} strokeWidth={1.5} />
            </button>
            <button
              className={styles.iconButton}
              onClick={handleWishlistClick}
              aria-label="علاقه‌مندی‌ها"
            >
              <Heart size={20} strokeWidth={1.5} />
            </button>
            <button className={styles.iconButton} onClick={handleCartClick} aria-label="سبد خرید">
              <ShoppingBag size={20} strokeWidth={1.5} />
            </button>
            <button
              className={styles.iconButton}
              onClick={handleAccountClick}
              aria-label="حساب کاربری"
              aria-expanded={accountDropdownOpen}
            >
              <User size={20} strokeWidth={1.5} />
            </button>
            <button
              className={styles.menuToggle}
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {accountDropdownOpen && isLoggedIn && (
          <div className={styles.accountDropdown}>
            <a href="/profile" className={styles.dropdownItem}>
              <UserCircle size={16} strokeWidth={1.5} />
              پروفایل
            </a>
            <a href="/orders" className={styles.dropdownItem}>
              <Package size={16} strokeWidth={1.5} />
              سفارش‌ها
            </a>
            <button onClick={handleLogout} className={styles.dropdownItem}>
              <LogOut size={16} strokeWidth={1.5} />
              خروج
            </button>
          </div>
        )}

        {megaMenuOpen && megaMenuData[megaMenuOpen] && (
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
                        <a href={item.href} className={styles.megaMenuLink}>
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {mobileMenuOpen && (
        <div className={styles.mobileOverlay} onClick={closeMobileMenu} role="presentation" />
      )}

      <div
        id="mobile-menu"
        className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="منوی موبایل"
      >
        <nav aria-label="منوی موبایل">
          <ul className={styles.mobileNavList}>
            {navItems.map((item) => (
              <li key={item.id}>
                <a href={item.href} className={styles.mobileNavLink} onClick={closeMobileMenu}>
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <a href="/wishlist" className={styles.mobileNavLink} onClick={closeMobileMenu}>
                علاقه‌مندی‌ها
              </a>
            </li>
            <li>
              <a href="/profile" className={styles.mobileNavLink} onClick={closeMobileMenu}>
                حساب کاربری
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </>
  );
}
