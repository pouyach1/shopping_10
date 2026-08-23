import { WishlistHeader } from '../WishlistHeader/WishlistHeader';
import { WishlistItem } from '../WishlistItem/WishlistItem';
import { WishlistActions } from '../WishlistActions/WishlistActions';
import { WishlistEmpty } from '../WishlistEmpty/WishlistEmpty';
import { useWishlist } from '../../../hooks/useWishlist';
import styles from './WishlistPage.module.css';

export function WishlistPage() {
  const {
    items,
    removeItem,
    updateItemSize,
    updateItemComment,
    addToCart,
    addAllToCart,
    clearWishlist,
  } = useWishlist();

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.container}>
        <WishlistHeader itemCount={items.length} />

        {items.length === 0 ? (
          <WishlistEmpty />
        ) : (
          <>
            <div className={styles.list}>
              {items.map((item) => (
                <WishlistItem
                  key={item.id}
                  item={item}
                  onRemove={removeItem}
                  onAddToBag={addToCart}
                  onUpdateSize={updateItemSize}
                  onUpdateComment={updateItemComment}
                />
              ))}
            </div>

            <WishlistActions
              items={items}
              onAddAllToBag={addAllToCart}
              onClearAll={clearWishlist}
            />
          </>
        )}
      </div>
    </main>
  );
}
