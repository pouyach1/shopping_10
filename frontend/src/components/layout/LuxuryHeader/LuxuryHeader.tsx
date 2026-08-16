import { useState } from 'react';
import { Heart, Menu, Search, ShoppingBag, X } from 'lucide-react';
import styles from './LuxuryHeader.module.css';

interface LuxuryHeaderProps {
  logo?: string;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  onWishlistClick?: () => void;
  onCartClick?: () => void;
}

export function LuxuryHeader({
  logo = 'LUXORA',
  onMenuClick,
  onSearchClick,
  onWishlistClick,
  onCartClick,
}: LuxuryHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
    if (onMenuClick) onMenuClick();
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={toggleMenu}
          aria-label="منو"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
        </button>

        <a href="/" className={styles.logo}>
          {logo}
        </a>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onSearchClick}
            aria-label="جستجو"
          >
            <Search size={20} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onWishlistClick}
            aria-label="علاقه‌مندی‌ها"
          >
            <Heart size={20} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onCartClick}
            aria-label="سبد خرید"
          >
            <ShoppingBag size={20} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
