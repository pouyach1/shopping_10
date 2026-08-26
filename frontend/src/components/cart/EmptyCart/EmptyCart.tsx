import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

import styles from './EmptyCart.module.css';

export function EmptyCart() {
  return (
    <div className={styles.empty}>
      <span className={styles.icon} aria-hidden="true">
        <ShoppingBag size={28} strokeWidth={1.4} />
      </span>
      <h1 className={styles.title}>سبد خرید شما خالی است</h1>
      <p className={styles.description}>
        هنوز انتخابی برای شما آماده نشده. از مجموعه لوکسورا شروع کنید.
      </p>
      <Link to="/shop" className={styles.cta}>
        مشاهده فروشگاه
      </Link>
    </div>
  );
}
