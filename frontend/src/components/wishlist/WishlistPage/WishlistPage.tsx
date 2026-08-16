import { useState } from 'react';
import { WishlistHeader } from '../WishlistHeader/WishlistHeader';
import { WishlistItem } from '../WishlistItem/WishlistItem';
import { WishlistActions } from '../WishlistActions/WishlistActions';
import { WishlistEmpty } from '../WishlistEmpty/WishlistEmpty';
import type { WishlistItem as WishlistItemType } from '../../../pages/Wishlist/types';
import { mockWishlistItems } from '../../../pages/Wishlist/data';
import styles from './WishlistPage.module.css';

export function WishlistPage() {
  const [items, setItems] = useState<WishlistItemType[]>(mockWishlistItems);

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddToBag = (item: WishlistItemType) => {
    console.log('Add to bag:', item.id);
  };

  const handleAddAllToBag = (allItems: WishlistItemType[]) => {
    console.log('Add all to bag:', allItems.map((item) => item.id));
  };

  const handleUpdateSize = (id: string, size: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, size } : item,
      ),
    );
  };

  const handleUpdateComment = (id: string, comment: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, comment } : item,
      ),
    );
  };

  const handleClearAll = () => {
    setItems([]);
  };

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
                  onRemove={handleRemove}
                  onAddToBag={handleAddToBag}
                  onUpdateSize={handleUpdateSize}
                  onUpdateComment={handleUpdateComment}
                />
              ))}
            </div>

            <WishlistActions
              items={items}
              onAddAllToBag={handleAddAllToBag}
              onClearAll={handleClearAll}
            />
          </>
        )}
      </div>
    </main>
  );
}
