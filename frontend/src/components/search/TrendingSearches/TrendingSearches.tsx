import styles from './TrendingSearches.module.css';
import { trendingSearches } from '../../../pages/Search/data';

interface TrendingSearchesProps {
  onSelect: (term: string) => void;
}

export function TrendingSearches({ onSelect }: TrendingSearchesProps) {
  return (
    <div className={styles.trending}>
      <h3 className={styles.title}>جستجوهای محبوب</h3>
      <div className={styles.list}>
        {trendingSearches.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.item}
            onClick={() => onSelect(item.term)}
          >
            {item.term}
          </button>
        ))}
      </div>
    </div>
  );
}
