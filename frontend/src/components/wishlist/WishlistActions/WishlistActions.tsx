import type { WishlistItem } from '../../../types/wishlist';
import styles from './WishlistActions.module.css';

interface WishlistActionsProps {
  items: WishlistItem[];
  onAddAllToBag: (items: WishlistItem[]) => void;
  onClearAll: () => void;
}

export function WishlistActions({ items, onAddAllToBag, onClearAll }: WishlistActionsProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Wishlist',
          text: 'Check out my wishlist on LUXORA',
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard?.writeText(window.location.href);
      } catch {
        // Clipboard unavailable
      }
    }
  };

  return (
    <div className={styles.actions}>
      <div className={styles.secondary}>
        <button type="button" className={styles.link} onClick={onClearAll}>
          پاک کردن علاقه‌مندی‌ها
        </button>
        <button type="button" className={styles.link} onClick={handleShare}>
          اشتراک‌گذاری لیست علاقه‌مندی‌ها
        </button>
      </div>

      <button
        type="button"
        className={styles.primary}
        onClick={() => onAddAllToBag(items)}
        disabled={items.length === 0}
      >
        افزودن همه به سبد خرید
      </button>
    </div>
  );
}
