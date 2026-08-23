import { useRef, type FormEvent } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { CatalogResults } from '../../components/catalog/CatalogResults';

import styles from './Search.module.css';

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromUrl = searchParams.get('q') ?? '';
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = inputRef.current?.value.trim() ?? '';

    if (trimmed) {
      setSearchParams({ q: trimmed });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className={styles.page} dir="rtl">
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            LUXORA SEARCH
            <span className={styles.eyebrowLine} aria-hidden="true" />
          </span>
          <h1>
            جستجو در <em>لوکسورا</em>
          </h1>
          <p className={styles.heroDescription}>
            نام محصول، دسته‌بندی یا ویژگی مورد نظر خود را جستجو کنید.
          </p>

          <form className={styles.searchForm} onSubmit={handleSubmit}>
            <SearchIcon strokeWidth={1.5} aria-hidden="true" />
            <input
              ref={inputRef}
              key={queryFromUrl}
              type="search"
              name="q"
              defaultValue={queryFromUrl}
              placeholder="مثلاً پالتو پشمی، بلوز حریر، کیف چرمی..."
              aria-label="جستجوی محصولات"
            />
            <button type="submit">جستجو</button>
          </form>
        </div>
      </section>

      <CatalogResults
        title="نتایج جستجو"
        eyebrow="SEARCH RESULTS"
        queryLabel={queryFromUrl.trim() || undefined}
        initialQuery={queryFromUrl}
      />
    </div>
  );
}
