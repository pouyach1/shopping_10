import { useState } from 'react';
import { Heart } from 'lucide-react';
import type { Product } from '../../pages/Home/types';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { name, price, originalPrice, currency, imageSrc, imageAlt, badge, href } = product;
  const [isWishlisted, setIsWishlisted] = useState(false);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('fa-IR').format(value);
  };

  return (
    <div className={styles.card}>
      <a href={href} className={styles.imageLink} aria-label={name}>
        <div className={styles.imageWrapper}>
          <img
            src={imageSrc}
            alt={imageAlt}
            className={styles.image}
            loading="lazy"
          />
          {badge && <span className={styles.badge}>{badge}</span>}
          <button
            type="button"
            className={`${styles.wishlistButton} ${isWishlisted ? styles.wishlistActive : ''}`}
            aria-label={isWishlisted ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsWishlisted((prev) => !prev);
            }}
          >
            <Heart
              size={20}
              strokeWidth={2}
              className={styles.wishlistIcon}
              fill={isWishlisted ? '#1A1A1A' : 'none'}
            />
          </button>
        </div>
      </a>

      <a href={href} className={styles.infoLink}>
        <div className={styles.info}>
          <h3 className={styles.name}>{name}</h3>
          <div className={styles.priceGroup}>
            <span className={styles.price}>
              {formatPrice(price)} {currency}
            </span>
            {originalPrice && originalPrice > price && (
              <span className={styles.originalPrice}>
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
        </div>
      </a>
    </div>
  );
}
