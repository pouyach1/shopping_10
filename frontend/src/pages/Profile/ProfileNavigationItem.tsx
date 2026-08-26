import { ChevronLeft } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

import { toPersianItemCount } from '../../services/customerOrders';

import styles from './ProfileAccountHub.module.css';

interface ProfileNavigationItemProps {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  count?: number;
}

export function ProfileNavigationItem({
  to,
  title,
  description,
  icon: Icon,
  count,
}: ProfileNavigationItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${styles.navRow} ${isActive ? styles.navRowActive : ''}`
      }
    >
      <span className={styles.navIcon} aria-hidden="true">
        <Icon size={18} strokeWidth={1.6} />
      </span>
      <span className={styles.navCopy}>
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      {typeof count === 'number' ? (
        <span className={styles.navCount}>{toPersianItemCount(count)}</span>
      ) : null}
      <ChevronLeft
        className={styles.navChevron}
        size={18}
        strokeWidth={1.6}
        aria-hidden="true"
      />
    </NavLink>
  );
}
