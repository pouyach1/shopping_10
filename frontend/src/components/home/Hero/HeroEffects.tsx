import styles from './HeroEffects.module.css';

/**
 * HeroEffects — Editorial decorative typography overlaid on the Hero image.
 * Contains giant background number, outline typography, vertical label,
 * editorial micro-labels, and script accent.
 */
export function HeroEffects() {
  return (
    <>
      {/* Giant Background Number */}
      <div className={styles.giantNumber} aria-hidden="true">
        01
      </div>

      {/* Outline Brand Typography */}
      <div className={styles.outlineBrand} aria-hidden="true">
        LUXORA
      </div>

      {/* Brand — Upper Left */}
      <div className={styles.brandLabel} aria-hidden="true">
        LUXORA
      </div>

      {/* Editorial Micro Labels */}
      <div className={styles.eyebrowLabel} aria-hidden="true">
        SPRING / SUMMER 2026
      </div>

      <div className={styles.collectionLabel} aria-hidden="true">
        NEW COLLECTION
      </div>

      <div className={styles.onlineLabel} aria-hidden="true">
        ONLY ONLINE
      </div>

      <div className={styles.paginationLabel} aria-hidden="true">
        01 / 04
      </div>

      {/* Vertical Typography */}
      <div className={styles.verticalLabel} aria-hidden="true">
        LUXORA STUDIO
      </div>

      {/* Script Element */}
      <div className={styles.scriptLabel} aria-hidden="true">
        The New Look
      </div>
    </>
  );
}
