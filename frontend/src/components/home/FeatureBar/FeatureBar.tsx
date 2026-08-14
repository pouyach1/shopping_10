import { Truck, RotateCcw, ShieldCheck, Award, Headphones, type LucideIcon } from 'lucide-react';
import { useScrollReveal } from '../../../hooks/useScrollReveal';
import type { FeatureItem } from '../../../pages/Home/types';
import styles from './FeatureBar.module.css';

interface FeatureBarProps {
  features: FeatureItem[];
}

const iconMap: Record<string, LucideIcon> = {
  Truck,
  RotateCcw,
  ShieldCheck,
  Award,
  Headphones,
};

export function FeatureBar({ features }: FeatureBarProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      className={`${styles.featureBar} ${isVisible ? styles.visible : ''}`}
      aria-label="Store features"
    >
      <div className={styles.featureBarInner}>
        {features.map((feature, index) => {
          const Icon = iconMap[feature.icon] || Award;
          return (
            <div
              key={feature.id}
              className={styles.featureItem}
              style={{ transitionDelay: `${index * 75}ms` }}
            >
              <Icon
                size={24}
                strokeWidth={1.25}
                className={styles.icon}
                aria-hidden="true"
              />
              <div className={styles.featureText}>
                <span className={styles.featureTitle}>{feature.title}</span>
                <span className={styles.featureDescription}>{feature.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
