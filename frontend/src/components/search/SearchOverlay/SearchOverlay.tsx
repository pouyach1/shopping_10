import {
  useEffect,
  useRef,
} from 'react';

import {
  Search as SearchIcon,
  X,
} from 'lucide-react';

import { useSearch } from '../../../hooks/useSearch';

import { TrendingSearches } from '../TrendingSearches/TrendingSearches';
import { QuickCategories } from '../QuickCategories/QuickCategories';
import { SearchSuggestions } from '../SearchSuggestions/SearchSuggestions';
import { SearchProductPreview } from '../SearchProductPreview/SearchProductPreview';

import styles from './SearchOverlay.module.css';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({
  open,
  onClose,
}: SearchOverlayProps) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const {
    query,
    setQuery,
    filteredProducts,
    suggestions,
  } = useSearch();

  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () =>
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      );
  }, [open, onClose]);

  if (!open) return null;

  const hasQuery = Boolean(query.trim());

  const navigateToSearch = () => {
    const value = query.trim();

    if (!value) return;

    window.history.pushState(
      {},
      '',
      `/search?q=${encodeURIComponent(value)}`,
    );

    window.dispatchEvent(
      new PopStateEvent('popstate'),
    );

    onClose();
  };

  const handleSubmit = (
    event: React.FormEvent,
  ) => {
    event.preventDefault();
    navigateToSearch();
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="جستجوی LUXORA"
    >
      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="بستن جستجو"
      >
        <X
          size={22}
          strokeWidth={1.4}
        />
      </button>

      <div className={styles.inner}>
        <form
          onSubmit={handleSubmit}
          className={styles.searchForm}
          dir="rtl"
        >
          <SearchIcon
            size={20}
            strokeWidth={1.4}
            className={styles.searchIcon}
            aria-hidden="true"
          />

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="دنبال چه چیزی می‌گردید؟"
            className={styles.input}
            aria-label="جستجو در LUXORA"
            autoComplete="off"
          />

          {query && (
            <button
              type="button"
              className={styles.clearInput}
              onClick={() => setQuery('')}
              aria-label="پاک کردن جستجو"
            >
              <X
                size={15}
                strokeWidth={1.5}
              />
            </button>
          )}
        </form>

        {!hasQuery ? (
          <div className={styles.initialContent}>
            <TrendingSearches
              onSelect={setQuery}
            />

            <QuickCategories />

            <SearchProductPreview
              products={filteredProducts.slice(0, 4)}
            />
          </div>
        ) : (
          <div className={styles.resultsContent}>
            {suggestions.length > 0 && (
              <SearchSuggestions
                suggestions={suggestions}
                onSelect={setQuery}
              />
            )}

            <SearchProductPreview
              products={filteredProducts.slice(0, 6)}
            />

            {!filteredProducts.length && (
              <div className={styles.noResults}>
                <p>
                  نتیجه‌ای پیدا نشد.
                </p>

                <span>
                  عبارت دیگری را امتحان کنید.
                </span>
              </div>
            )}

            {filteredProducts.length > 0 && (
              <button
                type="button"
                className={styles.viewAll}
                onClick={navigateToSearch}
              >
                مشاهده همه نتایج
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
