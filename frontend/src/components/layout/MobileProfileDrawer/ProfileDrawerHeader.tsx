import type { ReactNode, RefObject } from 'react';
import { X } from 'lucide-react';

import styles from './MobileProfileDrawer.module.css';

interface ProfileDrawerHeaderProps {
  titleId: string;
  title: string;
  onClose: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
  children?: ReactNode;
}

export function ProfileDrawerHeader({
  titleId,
  title,
  onClose,
  closeRef,
  children,
}: ProfileDrawerHeaderProps) {
  return (
    <header className={styles.drawerHeader}>
      <div className={styles.drawerHeaderTop}>
        <h1 id={titleId} className={styles.drawerTitle}>
          {title}
        </h1>
        <button
          ref={closeRef}
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="بستن پروفایل"
        >
          <X size={22} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </div>
      {children}
    </header>
  );
}
