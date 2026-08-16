import { useHumanTyping } from '../../../hooks/useHumanTyping';
import { useScrollReveal } from '../../../hooks/useScrollReveal';
import styles from './PromoBanner.module.css';

interface PromoBannerProps {
  title: string;
  imageSrc: string;
  imageAlt: string;
}

export function PromoBanner({ title, imageSrc, imageAlt }: PromoBannerProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  const { displayedText, isDone } = useHumanTyping({
    text: title,
    start: isVisible,
  });

  return (
    <section
      ref={ref}
      className={`${styles.promoBanner} ${isVisible ? styles.visible : ''}`}
      aria-label={title}
    >
      <div className={styles.bannerInner}>
        <img
          src={imageSrc}
          alt={imageAlt}
          className={styles.backgroundImage}
          loading="lazy"
        />

        <div className={styles.overlay} aria-hidden="true" />

        <div className={styles.content}>
          <h2 className={styles.title} dir="rtl">
            <span className="sr-only">{title}</span>

            <span className={styles.typedText} aria-hidden="true">
              {displayedText}

              <span
                className={`${styles.caret} ${
                  isDone ? styles.caretIdle : ''
                }`}
              />
            </span>
          </h2>
        </div>
      </div>
    </section>
  );
}
