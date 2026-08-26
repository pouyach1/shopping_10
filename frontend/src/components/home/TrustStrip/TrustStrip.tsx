import { Link } from 'react-router-dom';

import type { FeatureItem } from '../../../pages/Home/types';
import { Reveal } from '../../ui/Reveal';
import {
  Truck,
  RotateCcw,
  ShieldCheck,
  Award,
  Headphones,
  type LucideIcon,
} from 'lucide-react';

import styles from './TrustStrip.module.css';

interface TrustStripProps {
  features: FeatureItem[];
}

const iconMap: Record<string, LucideIcon> = {
  Truck,
  RotateCcw,
  ShieldCheck,
  Award,
  Headphones,
};

export function TrustStrip({ features }: TrustStripProps) {
  return (
    <section className={styles.strip} aria-label="اطلاعات اعتماد فروشگاه">
      <Reveal variant="subtle" as="div">
        <ul className={styles.list}>
          {features.map((feature) => {
            const Icon = iconMap[feature.icon] || Award;
            const body = (
              <>
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={20} strokeWidth={1.5} />
                </span>
                <span className={styles.text}>
                  <strong>{feature.title}</strong>
                  <span>{feature.description}</span>
                </span>
              </>
            );

            return (
              <li key={feature.id} className={styles.item}>
                {feature.href ? (
                  <Link to={feature.href} className={styles.link}>
                    {body}
                  </Link>
                ) : (
                  <div className={styles.link}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
}
