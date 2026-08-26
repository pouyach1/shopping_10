import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

import { ProductGrid } from '../ProductGrid';
import { Reveal } from '../../ui/Reveal';
import type { Product } from '../../../types/product';

import styles from './ProductRecommendations.module.css';

interface RecommendationBlockProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  products: Product[];
  tone?: 'primary' | 'secondary' | 'discovery';
  shopLink?: boolean;
  columns?: 2 | 3 | 4;
}

function RecommendationBlock({
  title,
  subtitle,
  eyebrow,
  products,
  tone = 'primary',
  shopLink = false,
  columns = 4,
}: RecommendationBlockProps) {
  if (products.length === 0) return null;

  const sectionClass = [
    styles.section,
    tone === 'secondary' ? styles.secondary : '',
    tone === 'discovery' ? styles.discovery : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Reveal as="section" className={sectionClass} variant="subtle" stagger>
      <div className={styles.header}>
        <div className={styles.headingGroup}>
          {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
          <h2 className={styles.title}>{title}</h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>

        {shopLink ? (
          <Link to="/shop" className={styles.shopLink}>
            مشاهده همه
            <ChevronLeft size={16} aria-hidden />
          </Link>
        ) : null}
      </div>

      <div
        className={
          tone === 'discovery' ? styles.discoveryGrid : styles.gridWrap
        }
      >
        <ProductGrid
          products={products}
          columns={columns}
          gap={tone === 'discovery' ? 'sm' : 'md'}
          revealChildren
        />
      </div>
    </Reveal>
  );
}

export interface ProductRecommendationsProps {
  related: Product[];
  complementary: Product[];
  discovery: Product[];
}

export function ProductRecommendations({
  related,
  complementary,
  discovery,
}: ProductRecommendationsProps) {
  if (
    related.length === 0 &&
    complementary.length === 0 &&
    discovery.length === 0
  ) {
    return null;
  }

  return (
    <div className={styles.stack}>
      <RecommendationBlock
        title="محصولات مرتبط"
        eyebrow="LUXORA"
        products={related}
        tone="primary"
        shopLink
        columns={4}
      />

      <RecommendationBlock
        title="محصولات مکمل"
        subtitle="برای کامل‌تر شدن انتخاب شما"
        products={complementary}
        tone="secondary"
        columns={3}
      />

      <RecommendationBlock
        title="این محصولات را هم ببینید"
        products={discovery}
        tone="discovery"
        columns={2}
      />
    </div>
  );
}
