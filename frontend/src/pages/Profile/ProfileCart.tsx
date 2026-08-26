import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../lib/formatCurrency';
import { toPersianItemCount } from '../../services/customerOrders';

import { ProfileSection } from './ProfileSection';

import styles from './ProfileAccountHub.module.css';

export function ProfileCart() {
  const { items, itemCount, subtotal } = useCart();

  return (
    <ProfileSection lead="خلاصه سبد خرید — تسویه در صفحه سبد انجام می‌شود">
      {itemCount === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <ShoppingBag size={22} strokeWidth={1.5} />
          </span>
          <h2>سبد خرید خالی است</h2>
          <p>هنوز محصولی برای خرید انتخاب نشده است.</p>
          <Link to="/shop" className={styles.primaryButton}>
            مشاهده فروشگاه
          </Link>
        </div>
      ) : (
        <>
          <ul className={styles.itemList}>
            {items.map((item) => (
              <li key={item.id} className={styles.itemRow}>
                <div className={styles.itemMedia}>
                  <img
                    src={item.imageSrc}
                    alt={item.imageAlt || item.name}
                    width={64}
                    height={80}
                  />
                </div>
                <div className={styles.itemCopy}>
                  <p className={styles.itemName}>{item.name}</p>
                  <p className={styles.itemMeta}>
                    {formatPrice(item.price)} {item.currency}
                    {item.size ? ` · سایز ${item.size}` : ''}
                    {` · ${toPersianItemCount(item.quantity)} عدد`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className={styles.cartSubtotal}>
            جمع جزء:{' '}
            <strong>
              {formatPrice(subtotal)} تومان
            </strong>
          </p>
          <Link to="/cart" className={styles.primaryButton}>
            رفتن به سبد خرید
          </Link>
        </>
      )}
    </ProfileSection>
  );
}
