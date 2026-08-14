import { useScrollReveal } from '../../../hooks/useScrollReveal';
import { SocialIcon } from '../../ui/SocialIcon';
import type { SocialImage } from '../../../pages/Home/types';
import styles from './InstagramFeed.module.css';

interface InstagramFeedProps {
  title: string;
  handle?: string;
  images: SocialImage[];
}

export function InstagramFeed({ title, handle, images }: InstagramFeedProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      className={`${styles.instagram} ${isVisible ? styles.visible : ''}`}
      aria-label={title}
    >
      <div className={styles.instagramInner}>
        <h2 className={styles.title}>{title}</h2>
        {handle && (
          <p className={styles.handle}>
            <SocialIcon name="instagram" size={16} aria-hidden="true" />
            {handle}
          </p>
        )}
        <div className={styles.grid}>
          {images.map((image, index) => (
            <a
              key={image.id}
              href={image.href}
              className={styles.imageLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <img
                src={image.imageSrc}
                alt={image.imageAlt}
                className={styles.image}
                loading="lazy"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
