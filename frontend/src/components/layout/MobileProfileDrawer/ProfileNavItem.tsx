import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

import styles from './MobileProfileDrawer.module.css';

interface ProfileNavItemProps {
  to?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  description?: string;
  count?: number;
  countLabel?: string;
  danger?: boolean;
  onNavigate?: () => void;
}

export function ProfileNavItem({
  to,
  onClick,
  icon,
  label,
  description,
  count,
  countLabel,
  danger = false,
  onNavigate,
}: ProfileNavItemProps) {
  const className = `${styles.navItem} ${danger ? styles.navItemDanger : ''}`;

  const body = (
    <>
      <span className={styles.navIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.navCopy}>
        <strong>{label}</strong>
        {description ? <span>{description}</span> : null}
      </span>
      {typeof count === 'number' && count > 0 ? (
        <span
          className={styles.navCount}
          aria-label={countLabel ?? `${count}`}
        >
          {countLabel ?? String(count)}
        </span>
      ) : null}
      {!danger ? (
        <ChevronLeft
          className={styles.navChevron}
          size={18}
          strokeWidth={1.6}
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={className}
        onClick={() => {
          onNavigate?.();
        }}
      >
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  );
}
