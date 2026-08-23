import styles from './WishlistHeader.module.css';

interface WishlistHeaderProps {
  itemCount: number;
}

export function WishlistHeader({ itemCount }: WishlistHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>علاقه‌مندی‌ها</h1>
      <p className={styles.count}>
        {itemCount > 0 ? `${itemCount} محصول` : ''}
      </p>
    </header>
  );
}
