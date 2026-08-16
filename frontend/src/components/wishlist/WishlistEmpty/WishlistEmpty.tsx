import styles from './WishlistEmpty.module.css';

export function WishlistEmpty() {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>Your wishlist is empty</p>
      <p className={styles.description}>
        Save your favorite pieces for later.
      </p>
      <a href="/shop" className={styles.cta}>
        Continue shopping
      </a>
    </div>
  );
}
