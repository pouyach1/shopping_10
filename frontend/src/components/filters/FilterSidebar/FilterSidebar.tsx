import type {
  CategoryId,
  } from '../../../pages/Home/types';

import type {
  SearchFilters,
} from '../../../pages/Search/types';

import { PriceRange } from '../PriceRange/PriceRange';

import styles from './FilterSidebar.module.css';

interface Option {
  id: string;
  label: string;
  count: number;
}

interface FilterSidebarProps {
  filters: SearchFilters;
  options: {
    materials: Option[];
    brands: Option[];
    sizes: Option[];
  };
  onChange: (
    partial: Partial<SearchFilters>,
  ) => void;
  onClear: () => void;
}

const categories: {
  id: CategoryId;
  label: string;
}[] = [
  { id: 'women', label: 'زنانه' },
  { id: 'men', label: 'مردانه' },
  { id: 'bags', label: 'کیف' },
  { id: 'shoes', label: 'کفش' },
  { id: 'accessories', label: 'اکسسوری' },
];

export function FilterSidebar({
  filters,
  options,
  onChange,
  onClear,
}: FilterSidebarProps) {
  const toggle = (
    key: keyof Pick<
      SearchFilters,
      'categories' | 'materials' | 'brands' | 'sizes'
    >,
    value: string,
  ) => {
    const current = filters[key] as string[];

    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    onChange({ [key]: next });
  };

  const renderOptions = (
    key: 'categories' | 'materials' | 'brands' | 'sizes',
    items: Option[] | { id: CategoryId; label: string }[],
  ) => (
    <div className={styles.options}>
      {items.map((item) => {
        const active = (
          filters[key] as string[]
        ).includes(item.id);

        return (
          <label
            key={item.id}
            className={styles.option}
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() =>
                toggle(key, item.id)
              }
            />

            <span className={styles.check} />

            <span className={styles.label}>
              {item.label}
            </span>

            {'count' in item && (
              <span className={styles.count}>
                {item.count}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2>فیلترها</h2>

        <button
          type="button"
          onClick={onClear}
          className={styles.clear}
        >
          پاک کردن
        </button>
      </div>

      <section className={styles.section}>
        <h3>دسته‌بندی</h3>
        {renderOptions('categories', categories)}
      </section>

      <section className={styles.section}>
        <h3>جنس</h3>
        {renderOptions('materials', options.materials)}
      </section>

      <section className={styles.section}>
        <h3>برند</h3>
        {renderOptions('brands', options.brands)}
      </section>

      <section className={styles.section}>
        <h3>سایز</h3>
        {renderOptions('sizes', options.sizes)}
      </section>

      <section className={styles.section}>
        <h3>محدوده قیمت</h3>

        <PriceRange
          value={filters.priceRange}
          onChange={(priceRange) =>
            onChange({ priceRange })
          }
        />
      </section>
    </aside>
  );
}
