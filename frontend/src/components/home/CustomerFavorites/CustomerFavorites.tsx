import { useScrollReveal } from '../../../hooks/useScrollReveal';
import type { Product } from '../../../pages/Home/types';
import styles from './CustomerFavorites.module.css';

interface CustomerFavoritesProps {
  title: string;
  products: Product[];
}

export function CustomerFavorites({ title, products }: CustomerFavoritesProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      className={`${styles.favorites} ${isVisible ? styles.visible : ''}`}
      aria-label={title}
    >
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.grid}>
        {products.map((product, index) => (
          <a
            key={product.id}
            href={product.href}
            className={styles.productItem}
            style={{ transitionDelay: `${index * 75}ms` }}
          >
            <div className={styles.imageWrapper}>
              <img
                src={product.imageSrc}
                alt={product.imageAlt}
                className={styles.image}
                loading="lazy"
              />
            </div>
            <span className={styles.productName}>{product.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
