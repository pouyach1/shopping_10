import { useScrollReveal } from '../../../hooks/useScrollReveal';
import { HeroEffects } from './HeroEffects';
import styles from './Hero.module.css';

interface HeroProps {
  imageSrc: string;
  imageAlt: string;
}

export function Hero({ imageSrc, imageAlt }: HeroProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({
    threshold: 0.1,
  });

  return (
    <section
      ref={ref}
      className={`${styles.hero} ${isVisible ? styles.visible : ''}`}
      aria-label="Hero section"
    >
      <img src={imageSrc} alt={imageAlt} className={styles.heroImage} loading="eager" />
      <HeroEffects />
    </section>
  );
}
