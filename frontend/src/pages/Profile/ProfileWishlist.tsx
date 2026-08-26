import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

import { useWishlist } from '../../hooks/useWishlist';
import { formatPrice } from '../../lib/formatCurrency';

import { ProfileSection } from './ProfileSection';

import styles from './ProfileAccountHub.module.css';

export function ProfileWishlist() {
  const { items, itemCount, removeItem, addToCart } = useWishlist();

  return (
    <ProfileSection lead="محصولاتی که برای بعد ذخیره کرده‌اید">
      {itemCount === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Heart size={22} strokeWidth={1.5} />
          </span>
          <h2>لیست علاقه‌مندی خالی است</h2>
          <p>قطعه‌های مورد علاقه‌تان را ذخیره کنید تا بعداً راحت پیدا شوند.</p>
          <Link to="/shop" className={styles.primaryButton}>
            مشاهده فروشگاه
          </Link>
        </div>
      ) : (
        <>
          <ul className={styles.itemList}>
            {items.map((item) => (
              <li key={item.id} className={styles.itemRow}>
                <Link to={`/product/${item.productId}`} className={styles.itemMedia}>
                  <img
                    src={item.imageSrc}
                    alt={item.imageAlt || item.name}
                    width={64}
                    height={80}
                  />
                </Link>
                <div className={styles.itemCopy}>
                  <Link to={`/product/${item.productId}`} className={styles.itemName}>
                    {item.name}
                  </Link>
                  <p className={styles.itemMeta}>
                    {formatPrice(item.price)} {item.currency}
                    {item.size ? ` · سایز ${item.size}` : ''}
                  </p>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() => addToCart(item)}
                    >
                      افزودن به سبد
                    </button>
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() => removeItem(item.id)}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/wishlist" className={styles.secondaryButton}>
            مشاهده لیست کامل علاقه‌مندی‌ها
          </Link>
        </>
      )}
    </ProfileSection>
  );
}
