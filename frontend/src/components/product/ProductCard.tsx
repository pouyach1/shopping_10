import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

import type { Product } from '../../types/product';
import { formatPrice } from '../../lib/formatCurrency';
import { useWishlist } from '../../hooks/useWishlist';

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

  const { isInWishlist, toggleProduct } = useWishlist();
  const wishlisted = isInWishlist(product.id);

  return (
    <article className={styles.card}>
      <div className={styles.imageWrapper}>
        <Link
          to={href}
          className={styles.imageLink}
          aria-label={`مشاهده ${name}`}
        >
          <img
            src={imageSrc}
            alt={imageAlt}
            className={styles.image}
            loading="lazy"
            decoding="async"
          />
        </Link>

        {badge ? <span className={styles.badge}>{badge}</span> : null}

        <button
          type="button"
          className={`${styles.wishlistButton} ${
            wishlisted ? styles.wishlistActive : ''
          }`}
          aria-label={
            wishlisted
              ? `حذف ${name} از علاقه‌مندی‌ها`
              : `افزودن ${name} به علاقه‌مندی‌ها`
          }
          aria-pressed={wishlisted}
          onClick={() => toggleProduct(product)}
        >
          <Heart
            size={19}
            strokeWidth={1.7}
            className={styles.wishlistIcon}
            fill={wishlisted ? 'currentColor' : 'none'}
          />
        </button>
      </div>

      <Link to={href} className={styles.infoLink}>
        <div className={styles.info}>
          <h3 className={styles.name}>{name}</h3>
          <div className={styles.priceGroup}>
            <span className={styles.price}>
              {formatPrice(price)} {currency}
            </span>
            {originalPrice && originalPrice > price ? (
              <span className={styles.originalPrice}>
                {formatPrice(originalPrice)} {currency}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
