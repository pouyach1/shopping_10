import type { CtaButton } from '../../../pages/Home/types';
import styles from './Hero.module.css';

interface HeroTypographyProps {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryCta?: CtaButton;
  secondaryCta?: CtaButton;
  isVisible: boolean;
}

/**
 * HeroTypography — Editorial typography hierarchy for the Hero section.
 * Contains brand name, eyebrow, headline, description, and CTA buttons.
 */
export function HeroTypography({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  isVisible,
}: HeroTypographyProps) {
  const handleCtaClick = (cta?: CtaButton) => {
    if (cta?.onClick) {
      cta.onClick();
    }
    if (cta?.href) {
      window.location.href = cta.href;
    }
  };

  return (
    <div className={styles.textContent}>
      <span className={`${styles.brandName} ${isVisible ? styles.fadeUp : ''}`} style={{ animationDelay: '0ms' }}>
        LUXORA
      </span>

      {eyebrow && (
        <p className={`${styles.eyebrow} ${isVisible ? styles.fadeUp : ''}`} style={{ animationDelay: '100ms' }}>
          {eyebrow}
        </p>
      )}

      <h1 className={`${styles.title} ${isVisible ? styles.fadeUp : ''}`} style={{ animationDelay: '200ms' }}>
        {title.split('\n').map((line, i) => (
          <span key={i} className={styles.titleLine}>
            {line}
          </span>
        ))}
      </h1>

      {description && (
        <p className={`${styles.description} ${isVisible ? styles.fadeUp : ''}`} style={{ animationDelay: '350ms' }}>
          {description}
        </p>
      )}

      {(primaryCta || secondaryCta) && (
        <div className={`${styles.ctaGroup} ${isVisible ? styles.fadeUp : ''}`} style={{ animationDelay: '500ms' }}>
          {primaryCta && (
            <button
              className={styles.primaryCta}
              onClick={() => handleCtaClick(primaryCta)}
            >
              {primaryCta.label}
            </button>
          )}
          {secondaryCta && (
            <button
              className={styles.secondaryCta}
              onClick={() => handleCtaClick(secondaryCta)}
            >
              {secondaryCta.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
