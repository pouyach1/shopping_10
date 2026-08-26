import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import {
  PROFILE_HOME_PATH,
  PROFILE_TITLES,
  type ProfileSectionId,
} from './profileSections';

import styles from './ProfileAccountHub.module.css';

interface ProfileSectionHeaderProps {
  section: ProfileSectionId;
}

export function ProfileSectionHeader({ section }: ProfileSectionHeaderProps) {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isHome = section === 'home';

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [section]);

  return (
    <header className={styles.sectionHeader}>
      {isHome ? null : (
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(PROFILE_HOME_PATH)}
          aria-label="بازگشت به پروفایل"
        >
          <ChevronRight size={22} strokeWidth={1.6} aria-hidden="true" />
        </button>
      )}
      <h1
        ref={headingRef}
        tabIndex={-1}
        className={styles.sectionTitle}
      >
        {PROFILE_TITLES[section]}
      </h1>
    </header>
  );
}
