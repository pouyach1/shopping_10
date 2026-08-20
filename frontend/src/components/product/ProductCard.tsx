import { useState } from 'react';
import { Heart } from 'lucide-react';
import type { Product } from '../../types/product';
import { formatPrice } from '../../lib/formatCurrency';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const {
    name,
    price,
    originalPrice,
    currency,
    imageSrc,
    imageAlt,
    badge,
    href,
  } = product;

  const [isWishlisted, setIsWishlisted] = useState(false);

  return (
    <article className={styles.card}>
      <div className={styles.imageWrapper}>
        <a
          href={href}
          className={styles.imageLink}
          aria-label={`مشاهده ${name}`}
        >
          <img
            src={imageSrc}
            alt={imageAlt}
            className={styles.image}
            loading="lazy"
          />
        </a>

        {badge && (
          <span className={styles.badge}>
            {badge}
          </span>
        )}

        <button
          type="button"
          className={`${styles.wishlistButton} ${
            isWishlisted ? styles.wishlistActive : ''
          }`}
          aria-label={
            isWishlisted
              ? `حذف ${name} از علاقه‌مندی‌ها`
              : `افزودن ${name} به علاقه‌مندی‌ها`
          }
          aria-pressed={isWishlisted}
          onClick={() => setIsWishlisted((previous) => !previous)}
        >
          <Heart
            size={19}
            strokeWidth={1.7}
            className={styles.wishlistIcon}
            fill={isWishlisted ? 'currentColor' : 'none'}
          />
        </button>
      </div>

      <a href={href} className={styles.infoLink}>
        <div className={styles.info}>
          <h3 className={styles.name}>
            {name}
          </h3>

          <div className={styles.priceGroup}>
            <span className={styles.price}>
              {formatPrice(price)} {currency}
            </span>

            {originalPrice && originalPrice > price && (
              <span className={styles.originalPrice}>
                {formatPrice(originalPrice)} {currency}
              </span>
            )}
          </div>
        </div>
      </a>
    </article>
  );
}
