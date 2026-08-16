import { useState } from 'react';
import type { CategoryId } from '../../../pages/Home/types';
import { getRandomCategoryBanner } from '../../../config/categoryBanners';
import styles from './CategoryBanner.module.css';

interface CategoryBannerProps {
  category: CategoryId;
}

export function CategoryBanner({ category }: CategoryBannerProps) {
  const [currentBanner] = useState(() => getRandomCategoryBanner(category));

  if (!currentBanner) return null;

  return (
    <section className={styles.banner} aria-label={currentBanner.title}>
      {currentBanner.type === 'video' ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={currentBanner.poster}
          className={styles.media}
        >
          <source src={currentBanner.src} type="video/mp4" />
        </video>
      ) : (
        <img
          src={currentBanner.src}
          alt={currentBanner.title}
          className={styles.media}
          style={{ objectPosition: currentBanner.objectPosition }}
          loading="lazy"
        />
      )}

      <div className={styles.overlay} aria-hidden="true" />

      <div className={styles.content} dir="rtl">
        {currentBanner.eyebrow && (
          <span className={styles.eyebrow}>{currentBanner.eyebrow}</span>
        )}

        <h2 className={styles.title}>{currentBanner.title}</h2>

        {currentBanner.description && (
          <p className={styles.description}>{currentBanner.description}</p>
        )}

        {currentBanner.href && (
          <a href={currentBanner.href} className={styles.cta}>
            مشاهده مجموعه
          </a>
        )}
      </div>
    </section>
  );
}
