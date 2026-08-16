import { ArrowUpLeft } from 'lucide-react';

import type { SearchSuggestion } from '../../../pages/Search/types';

import styles from './SearchSuggestions.module.css';

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  onSelect: (text: string) => void;
}

export function SearchSuggestions({
  suggestions,
  onSelect,
}: SearchSuggestionsProps) {
  if (!suggestions.length) return null;

  return (
    <section
      className={styles.suggestions}
      dir="rtl"
    >
      <div className={styles.title}>
        پیشنهادهای جستجو
      </div>

      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          className={styles.item}
          onClick={() =>
            onSelect(suggestion.text)
          }
        >
          <span className={styles.type}>
            {suggestion.type === 'tag'
              ? 'موضوع'
              : 'محصول'}
          </span>

          <span className={styles.text}>
            {suggestion.text}
          </span>

          <ArrowUpLeft
            size={14}
            strokeWidth={1.3}
          />
        </button>
      ))}
    </section>
  );
}
