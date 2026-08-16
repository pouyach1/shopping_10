import styles from './EmptyCart.module.css';

export function EmptyCart() {
  return (
    <div className={styles.empty}>
      <h1 className={styles.title}>سبد خرید شما خالی است</h1>
      <p className={styles.description}>
        برای شروع خرید به فروشگاه بازگردید.
      </p>
      <a href="/shop" className={styles.cta}>
        بازگشت به فروشگاه
      </a>
    </div>
  );
}
