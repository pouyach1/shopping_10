import { useScrollReveal } from '../../../hooks/useScrollReveal';
import type { CtaButton } from '../../../pages/Home/types';
import styles from './PromoBanner.module.css';

interface PromoBannerProps {
  eyebrow?: string;
  title: string;
  cta?: CtaButton;
  imageSrc: string;
  imageAlt: string;
}

export function PromoBanner({ eyebrow, title, cta, imageSrc, imageAlt }: PromoBannerProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  const handleCtaClick = () => {
    if (cta?.onClick) {
      cta.onClick();
    }
    if (cta?.href) {
      window.location.href = cta.href;
    }
  };

  return (
    <section
      ref={ref}
      className={`${styles.promoBanner} ${isVisible ? styles.visible : ''}`}
      aria-label={title}
    >
      <div className={styles.bannerInner}>
        <img src={imageSrc} alt={imageAlt} className={styles.backgroundImage} loading="lazy" />
        <div className={styles.overlay} aria-hidden="true" />
        <div className={styles.content}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h2 className={styles.title}>
            {title.split('\n').map((line, i) => (
              <span key={i} className={styles.titleLine}>
                {line}
              </span>
            ))}
          </h2>
          {cta && (
            <button className={styles.cta} onClick={handleCtaClick}>
              {cta.label}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
