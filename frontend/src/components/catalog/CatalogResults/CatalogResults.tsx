import { useState } from 'react';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';

import { FilterSidebar } from '../../filters/FilterSidebar/FilterSidebar';
import { MobileFilterDrawer } from '../../filters/MobileFilterDrawer/MobileFilterDrawer';
import { ProductGrid } from '../../product/ProductGrid';
import { useSearch } from '../../../hooks/useSearch';
import type { CategoryId } from '../../../pages/Home/types';
import { SORT_OPTIONS, type SortOption } from '../../../pages/Search/types';

import styles from '../../../pages/Search/Search.module.css';

const CATEGORY_LABELS: Record<CategoryId, string> = {
  women: 'زنانه',
  men: 'مردانه',
  bags: 'کیف',
  shoes: 'کفش',
  accessories: 'اکسسوری',
};

interface CatalogResultsProps {
  title: string;
  eyebrow?: string;
  queryLabel?: string;
  initialCategories?: CategoryId[];
  initialQuery?: string;
}

export function CatalogResults({
  title,
  eyebrow = 'LUXORA COLLECTION',
  queryLabel,
  initialCategories = [],
  initialQuery = '',
}: CatalogResultsProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const {
    filters,
    sortBy,
    setSortBy,
    filteredProducts,
    filterOptions,
    activeFilterCount,
    clearFilters,
    updateFilters,
    totalResults,
  } = useSearch(initialQuery, { initialCategories });

  const categorySummary =
    initialCategories.length === 1
      ? CATEGORY_LABELS[initialCategories[0]]
      : null;

  return (
    <section className={styles.results} aria-label={title}>
      <div className={styles.resultsHeader}>
        <div className={styles.resultTitle}>
          <span className={styles.resultEyebrow}>{eyebrow}</span>
          <h2>
            {queryLabel ? (
              <>
                نتایج برای <strong>«{queryLabel}»</strong>
              </>
            ) : categorySummary ? (
              <>
                مجموعه <strong>{categorySummary}</strong>
              </>
            ) : (
              title
            )}
          </h2>
          <span className={styles.resultCount}>
            {totalResults} محصول
          </span>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.mobileFilterButton}
            onClick={() => setMobileFiltersOpen(true)}
          >
            <SlidersHorizontal size={14} strokeWidth={1.5} />
            فیلتر
            {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
          </button>

          <label className={styles.sort}>
            <span>مرتب‌سازی</span>
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as SortOption)
              }
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className={styles.activeFilters}>
          <span>{activeFilterCount} فیلتر فعال</span>
          <button type="button" onClick={clearFilters}>
            پاک کردن همه
          </button>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.desktopFilters}>
          <FilterSidebar
            filters={filters}
            options={filterOptions}
            onChange={updateFilters}
            onClear={clearFilters}
          />
        </div>

        <div className={styles.products}>
          {filteredProducts.length > 0 ? (
            <ProductGrid products={filteredProducts} columns={4} gap="lg" />
          ) : (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <SearchIcon size={22} strokeWidth={1.4} />
              </div>
              <span className={styles.emptyEyebrow}>LUXORA</span>
              <h2>محصولی یافت نشد</h2>
              <p>
                فیلترها یا عبارت جستجو را تغییر دهید، یا به فروشگاه
                بازگردید.
              </p>
              <button type="button" onClick={clearFilters}>
                پاک کردن فیلترها
              </button>
            </div>
          )}
        </div>
      </div>

      <MobileFilterDrawer
        open={mobileFiltersOpen}
        filters={filters}
        options={filterOptions}
        onChange={updateFilters}
        onClear={clearFilters}
        onClose={() => setMobileFiltersOpen(false)}
      />
    </section>
  );
}
