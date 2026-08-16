import { X } from 'lucide-react';

import type { SearchFilters } from '../../../pages/Search/types';

import { FilterSidebar } from '../FilterSidebar/FilterSidebar';

import styles from './MobileFilterDrawer.module.css';

interface MobileFilterDrawerProps {
  open: boolean;
  filters: SearchFilters;
  options: {
    materials: {
      id: string;
      label: string;
      count: number;
    }[];
    brands: {
      id: string;
      label: string;
      count: number;
    }[];
    sizes: {
      id: string;
      label: string;
      count: number;
    }[];
  };
  onChange: (
    partial: Partial<SearchFilters>,
  ) => void;
  onClear: () => void;
  onClose: () => void;
}

export function MobileFilterDrawer({
  open,
  filters,
  options,
  onChange,
  onClear,
  onClose,
}: MobileFilterDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div
        className={styles.backdrop}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="فیلتر محصولات"
      >
        <div className={styles.top}>
          <span>فیلتر محصولات</span>

          <button
            type="button"
            onClick={onClose}
            aria-label="بستن فیلتر"
          >
            <X size={20} strokeWidth={1.4} />
          </button>
        </div>

        <div className={styles.content}>
          <FilterSidebar
            filters={filters}
            options={options}
            onChange={onChange}
            onClear={onClear}
          />
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
          >
            مشاهده نتایج
          </button>
        </div>
      </aside>
    </>
  );
}
