import type { Product } from '../../types/product';
import { ProductCard } from './ProductCard';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: Product[];
  columns?: 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  /** Mark each card for Reveal stagger parents. */
  revealChildren?: boolean;
}

export function ProductGrid({
  products,
  columns = 5,
  gap = 'md',
  revealChildren = false,
}: ProductGridProps) {
  const columnClass = {
    2: styles.columns2,
    3: styles.columns3,
    4: styles.columns4,
    5: styles.columns5,
    6: styles.columns6,
  }[columns];

  const gapClass = {
    sm: styles.gapSm,
    md: styles.gapMd,
    lg: styles.gapLg,
  }[gap];

  return (
    <div className={`${styles.grid} ${columnClass} ${gapClass}`}>
      {products.map((product) => (
        <div
          key={product.id}
          className={styles.cell}
          {...(revealChildren ? { 'data-reveal-child': true } : {})}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
