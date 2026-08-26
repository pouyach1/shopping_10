import { Link } from 'react-router-dom';

import styles from './Hero.module.css';

interface HeroCta {
  label: string;
  href: string;
}

interface HeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryCta: HeroCta;
  imageSrc: string;
  imageAlt: string;
}

/**
 * Conversion-first Hero: Persian headline, clear CTA, restrained visual.
 * Decorative-only overlays and fake carousel controls are intentionally gone.
 */
export function Hero({
  eyebrow,
  title,
  description,
  primaryCta,
  imageSrc,
  imageAlt,
}: HeroProps) {
  return (
    <section className={styles.hero} aria-labelledby="home-hero-title">
      <div className={styles.media}>
        <img
          src={imageSrc}
          alt={imageAlt}
          className={styles.image}
          width={1376}
          height={768}
          decoding="async"
          fetchPriority="high"
          loading="eager"
        />
        <div className={styles.overlay} aria-hidden="true" />
      </div>

      <div className={styles.content}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}

        <h1 id="home-hero-title" className={styles.title}>
          {title}
        </h1>

        {description ? (
          <p className={styles.description}>{description}</p>
        ) : null}

        <div className={styles.actions}>
          <Link to={primaryCta.href} className={styles.primaryCta}>
            {primaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
