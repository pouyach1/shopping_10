import { useScrollReveal } from '../../../hooks/useScrollReveal';
import styles from './EditorialBreak.module.css';

/**
 * EditorialBreak — A reusable luxury editorial transition section.
 * Creates a refined visual pause between homepage sections.
 */
export function EditorialBreak() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      className={`${styles.editorialBreak} ${isVisible ? styles.visible : ''}`}
      aria-label="LUXORA editorial transition"
    >
      <div className={styles.inner}>
        <span className={styles.brandLabel}>LUXORA</span>
        <span className={styles.smallLabel}>CURATED WITH INTENTION</span>
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.mainPhrase}>THE MODERN WARDROBE</span>
      </div>
    </section>
  );
}
