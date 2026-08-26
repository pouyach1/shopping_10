import type { ReactNode } from 'react';

import styles from './MobileProfileDrawer.module.css';

interface ProfileNavSectionProps {
  title: string;
  children: ReactNode;
  titleId: string;
}

export function ProfileNavSection({
  title,
  children,
  titleId,
}: ProfileNavSectionProps) {
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.sectionTitle}>
        {title}
      </h2>
      <div className={styles.sectionList}>{children}</div>
    </section>
  );
}
