import { Link } from 'react-router-dom';

import styles from './PromoBanner.module.css';

interface PromoBannerProps {
  title: string;
  description?: string;
  ctaLabel: string;
  ctaHref: string;
  imageSrc: string;
  imageAlt: string;
}

export function PromoBanner({
  title,
  description,
  ctaLabel,
  ctaHref,
  imageSrc,
  imageAlt,
}: PromoBannerProps) {
  return (
    <section className={styles.promoBanner} aria-labelledby="home-promo-title">
      <div className={styles.bannerInner}>
        <img
          src={imageSrc}
          alt={imageAlt}
          className={styles.backgroundImage}
          loading="lazy"
          decoding="async"
        />
        <div className={styles.overlay} aria-hidden="true" />
        <div className={styles.content}>
          <h2 id="home-promo-title" className={styles.title}>
            {title}
          </h2>
          {description ? (
            <p className={styles.description}>{description}</p>
          ) : null}
          <Link to={ctaHref} className={styles.cta}>
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
