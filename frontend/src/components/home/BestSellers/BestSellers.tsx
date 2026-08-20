import { useScrollReveal } from '../../../hooks/useScrollReveal';
import { ProductGrid } from '../../product/ProductGrid';
import type { Product } from '../../../types/product';
import styles from './BestSellers.module.css';

interface BestSellersProps {
  title: string;
  description?: string;
  products: Product[];
}

export function BestSellers({ title, description, products }: BestSellersProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      className={`${styles.bestSellers} ${isVisible ? styles.visible : ''}`}
      aria-label={title}
    >
      <div className={styles.bestSellersInner}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {description && <p className={styles.description}>{description}</p>}
          <a href="/shop" className={styles.viewAll}>
            مشاهده همه
          </a>
        </div>
        <ProductGrid products={products} columns={5} gap="lg" />
      </div>
    </section>
  );
}
