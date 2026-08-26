import { Link } from 'react-router-dom';

import { ProductGrid } from '../../product/ProductGrid';
import type { Product } from '../../../types/product';

import styles from './BestSellers.module.css';

interface BestSellersProps {
  title: string;
  description?: string;
  products: Product[];
}

export function BestSellers({ title, description, products }: BestSellersProps) {
  return (
    <section className={styles.bestSellers} aria-labelledby="home-bestsellers-title">
      <div className={styles.bestSellersInner}>
        <div className={styles.header}>
          <div className={styles.headingCopy}>
            <h2 id="home-bestsellers-title" className={styles.title}>
              {title}
            </h2>
            {description ? (
              <p className={styles.description}>{description}</p>
            ) : null}
          </div>
          <Link to="/shop" className={styles.viewAll}>
            مشاهده همه
          </Link>
        </div>
        <ProductGrid products={products} columns={3} gap="lg" />
      </div>
    </section>
  );
}
