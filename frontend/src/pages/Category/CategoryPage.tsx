import { useParams } from 'react-router-dom';

import { CategoryBanner } from '../../components/category/CategoryBanner/CategoryBanner';
import { CatalogResults } from '../../components/catalog/CatalogResults';
import type { CategoryId } from '../Home/types';
import { NotFound } from '../NotFound/NotFound';

import styles from '../Search/Search.module.css';

const VALID_CATEGORIES: CategoryId[] = [
  'women',
  'men',
  'bags',
  'shoes',
  'accessories',
];

function isCategoryId(value: string): value is CategoryId {
  return VALID_CATEGORIES.includes(value as CategoryId);
}

const CATEGORY_TITLES: Record<CategoryId, string> = {
  women: 'زنانه',
  men: 'مردانه',
  bags: 'کیف',
  shoes: 'کفش',
  accessories: 'اکسسوری',
};

export function CategoryPage() {
  const { slug } = useParams();

  if (!slug || !isCategoryId(slug)) {
    return <NotFound />;
  }

  return (
    <div className={styles.page} dir="rtl">
      <CategoryBanner category={slug} />

      <CatalogResults
        title={CATEGORY_TITLES[slug]}
        eyebrow="LUXORA CATEGORY"
        initialCategories={[slug]}
      />
    </div>
  );
}
