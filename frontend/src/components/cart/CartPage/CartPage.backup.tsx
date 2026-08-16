import { useState } from 'react';
import { CART_STORAGE_KEY } from '../../../pages/Wishlist/types';
import type { WishlistItem } from '../../../pages/Wishlist/types';
import styles from './CartPage.module.css';

interface CartState {
  items: WishlistItem[];
}

function loadCart(): CartState {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return { items: [] };
    return JSON.parse(stored) as CartState;
  } catch {
    return { items: [] };
  }
}

export function CartPage() {
  const [items] = useState<WishlistItem[]>(() => {
    const cart = loadCart();
    return cart.items ?? [];
  });

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('fa-IR').format(value);

  const total = items.reduce((sum, item) => sum + item.price, 0);

  if (items.length === 0) {
    return (
      <main className={styles.page} dir="rtl">
        <div className={styles.container}>
          <h1 className={styles.title}>سبد خرید</h1>
          <p className={styles.empty}>سبد خرید شما خالی است.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.container}>
        <h1 className={styles.title}>سبد خرید</h1>

        <div className={styles.list}>
          {items.map((item) => (
            <div key={item.id} className={styles.item}>
              <img
                src={item.imageSrc}
                alt={item.imageAlt}
                className={styles.image}
                loading="lazy"
              />
              <div className={styles.info}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.price}>
                  {formatPrice(item.price)} {item.currency}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.total}>
          <span>جمع کل</span>
          <strong>{formatPrice(total)} تومان</strong>
        </div>
      </div>
    </main>
  );
}
