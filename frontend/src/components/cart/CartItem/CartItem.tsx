import { motion } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
import type { CartItem as CartItemType } from '../../../types/cart';
import { formatPrice } from '../../../lib/formatCurrency';
import styles from './CartItem.module.css';

interface CartItemProps {
  item: CartItemType;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
}

export function CartItem({
  item,
  onRemove,
  onQuantityChange,
}: CartItemProps) {
  const decreaseQuantity = () => {
    if (item.quantity > 1) {
      onQuantityChange(item.id, item.quantity - 1);
    }
  };

  const increaseQuantity = () => {
    onQuantityChange(item.id, item.quantity + 1);
  };

  return (
    <motion.article
      className={styles.item}
      initial={{ opacity: 1, height: 'auto', scale: 1 }}
      exit={{
        opacity: 0,
        height: 0,
        scale: 0.97,
        overflow: 'hidden',
      }}
      transition={{
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
      }}
      layout
    >
      <div className={styles.imageWrapper}>
        <img
          src={item.imageSrc}
          alt={item.imageAlt || item.name}
          className={styles.image}
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>{item.name}</h3>

        <div className={styles.meta}>
          {item.color && (
            <span className={styles.colorInfo}>
              {item.colorValue && (
                <span
                  className={styles.colorSwatch}
                  style={{ backgroundColor: item.colorValue }}
                  aria-hidden="true"
                />
              )}
              {item.color}
            </span>
          )}

          <span className={styles.sizeInfo}>
            سایز {item.size}
          </span>
        </div>

        <div className={styles.quantityControl}>
          <button
            type="button"
            className={styles.quantityButton}
            onClick={decreaseQuantity}
            aria-label="کاهش تعداد"
            disabled={item.quantity <= 1}
          >
            <Minus size={13} strokeWidth={1.5} />
          </button>

          <span className={styles.quantityValue}>
            {item.quantity}
          </span>

          <button
            type="button"
            className={styles.quantityButton}
            onClick={increaseQuantity}
            aria-label="افزایش تعداد"
          >
            <Plus size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className={styles.price}>
        {formatPrice(item.price * item.quantity)}
        <span>{item.currency}</span>
      </div>

      <button
        type="button"
        className={styles.remove}
        onClick={() => onRemove(item.id)}
        aria-label="حذف از سبد"
      >
        <X size={15} strokeWidth={1.5} />
      </button>
    </motion.article>
  );
}
