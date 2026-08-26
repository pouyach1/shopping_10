import { ProfileSection } from './ProfileSection';

import styles from './ProfileAccountHub.module.css';

export function ProfileHome() {
  return (
    <ProfileSection>
      <p className={styles.homeWelcome}>
        سفارش‌ها، علاقه‌مندی‌ها و اطلاعات حساب خود را از اینجا مدیریت کنید.
      </p>
    </ProfileSection>
  );
}
