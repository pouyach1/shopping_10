import type { ReactNode } from 'react';

import styles from './ProfileAccountHub.module.css';

interface ProfileSectionProps {
  children: ReactNode;
  /** Optional lead shown on desktop; mobile uses the stable section header. */
  lead?: string;
  labelledBy?: string;
}

export function ProfileSection({
  children,
  lead,
  labelledBy,
}: ProfileSectionProps) {
  return (
    <section className={styles.panel} aria-labelledby={labelledBy}>
      {lead ? <p className={styles.panelLead}>{lead}</p> : null}
      {children}
    </section>
  );
}
