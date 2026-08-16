import { useState } from 'react';
import type { WishlistItem as WishlistItemType } from '../../../pages/Wishlist/types';
import styles from './WishlistItem.module.css';

interface WishlistItemProps {
  item: WishlistItemType;
  onRemove: (id: string) => void;
  onAddToBag: (item: WishlistItemType) => void;
  onUpdateSize: (id: string, size: string) => void;
  onUpdateComment: (id: string, comment: string) => void;
}

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL'];

export function WishlistItem({
  item,
  onRemove,
  onAddToBag,
  onUpdateSize,
  onUpdateComment,
}: WishlistItemProps) {

  const [isRemoving, setIsRemoving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentDraft, setCommentDraft] = useState(item.comment ?? '');
  const [addedToBag, setAddedToBag] = useState(false);


  const formatPrice = (value: number) =>
    new Intl.NumberFormat('fa-IR').format(value);


  const handleRemove = () => {
    setIsRemoving(true);

    setTimeout(() => {
      onRemove(item.id);
    }, 200);
  };


  const handleAddToBag = () => {
    onAddToBag(item);

    setAddedToBag(true);

    setTimeout(() => {
      setAddedToBag(false);
    }, 1500);
  };


  const handleSaveComment = () => {
    onUpdateComment(item.id, commentDraft);
    setIsCommenting(false);
  };


  return (
    <article
      className={`${styles.item} ${isRemoving ? styles.removing : ''}`}
      dir="rtl"
    >

      <div className={styles.info}>

        <h3 className={styles.name}>
          {item.name}
        </h3>


        <p className={styles.price}>
          {formatPrice(item.price)} {item.currency}
        </p>


        <p className={styles.size}>
          سایز: {item.size}
        </p>


        {item.comment && (
          <p className={styles.comment}>
            یادداشت: {item.comment}
          </p>
        )}



        <button
          type="button"
          className={styles.addToBag}
          onClick={handleAddToBag}
        >
          {
            addedToBag
              ? 'به سبد خرید اضافه شد ✓'
              : 'افزودن به سبد خرید'
          }
        </button>



        <div className={styles.actions}>

          <button
            type="button"
            className={styles.actionLink}
            onClick={() => setIsEditing(prev => !prev)}
          >
            تغییر سایز
          </button>


          <button
            type="button"
            className={styles.actionLink}
            onClick={handleRemove}
          >
            حذف از علاقه‌مندی‌ها
          </button>


          <button
            type="button"
            className={styles.actionLink}
            onClick={() => setIsCommenting(prev => !prev)}
          >
            افزودن یادداشت
          </button>

        </div>



        {isEditing && (

          <div className={styles.editPanel}>

            <span className={styles.editLabel}>
              انتخاب سایز
            </span>


            <div className={styles.sizeOptions}>

              {
                SIZE_OPTIONS.map((size) => (

                  <button
                    key={size}
                    type="button"
                    className={`${styles.sizeOption} ${
                      item.size === size
                        ? styles.sizeSelected
                        : ''
                    }`}
                    onClick={() => {
                      onUpdateSize(item.id, size);
                      setIsEditing(false);
                    }}
                  >
                    {size}
                  </button>

                ))
              }

            </div>

          </div>

        )}




        {isCommenting && (

          <div className={styles.commentEditor}>

            <input
              type="text"
              value={commentDraft}
              onChange={(e)=>setCommentDraft(e.target.value)}
              placeholder="یادداشت خود را بنویسید..."
              className={styles.commentInput}
              dir="rtl"
            />


            <div className={styles.commentActions}>


              <button
                type="button"
                className={styles.commentSave}
                onClick={handleSaveComment}
              >
                ذخیره
              </button>



              <button
                type="button"
                className={styles.commentCancel}
                onClick={() => setIsCommenting(false)}
              >
                لغو
              </button>


            </div>


          </div>

        )}

      </div>



      <a
        href={`/product/${item.productId}`}
        className={styles.imageLink}
      >

        <img
          src={item.imageSrc}
          alt={item.imageAlt}
          className={styles.image}
          loading="lazy"
        />

      </a>


    </article>
  );
}