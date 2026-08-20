import type { SearchProduct } from '../../../pages/Search/types';
import { formatPrice } from '../../../lib/formatCurrency';
import styles from './SearchProductPreview.module.css';

interface SearchProductPreviewProps {
  products: SearchProduct[];
}

export function SearchProductPreview({
  products,
}: SearchProductPreviewProps) {
  if (!products.length) return null;

  return (
    <div className={styles.preview} dir="rtl">
      <div className={styles.grid}>
        {products.map((product, index) => (
          <a
            key={product.id}
            href={product.href}
            className={styles.item}
            style={{
              animationDelay: `${Math.min(index * 45, 360)}ms`,
            }}
          >
            <div className={styles.imageWrapper}>
              <img
                src={product.imageSrc}
                alt={product.imageAlt}
                className={styles.image}
                loading={index < 4 ? 'eager' : 'lazy'}
              />

              <div className={styles.imageOverlay} />

              {product.badge && (
                <span className={styles.badge}>
                  {product.badge}
                </span>
              )}

              <span className={styles.viewProduct}>
                مشاهده
              </span>
            </div>

            <div className={styles.info}>
              <div className={styles.nameRow}>
                <span className={styles.name}>
                  {product.name}
                </span>

                <span className={styles.brand}>
                  {product.brand}
                </span>
              </div>

              <span className={styles.price}>
                {formatPrice(product.price)} {product.currency}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
