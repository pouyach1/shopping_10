import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingBag, User } from 'lucide-react';

import styles from './LuxuryHeader.module.css';

export function LuxuryHeader() {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.iconButton}
        aria-label="بازگشت"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>

      <Link to="/" className={styles.brand} aria-label="لوکسورا">
        LUXORA
      </Link>

      <div className={styles.actions}>
        <Link
          to="/profile"
          className={styles.iconButton}
          aria-label="حساب کاربری"
        >
          <User size={20} strokeWidth={1.5} aria-hidden="true" />
        </Link>
        <Link
          to="/wishlist"
          className={styles.iconButton}
          aria-label="علاقه‌مندی‌ها"
        >
          <Heart size={20} strokeWidth={1.5} aria-hidden="true" />
        </Link>
        <Link to="/cart" className={styles.iconButton} aria-label="سبد خرید">
          <ShoppingBag size={20} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
