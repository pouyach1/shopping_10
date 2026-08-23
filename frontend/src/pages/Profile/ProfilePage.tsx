import styles from './ProfilePage.module.css';

export function ProfilePage() {
  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.card}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>LUXORA</span>
          <h1 className={styles.title}>حساب کاربری</h1>
        </header>

        <span className={styles.divider} aria-hidden="true" />

        <p className={styles.description}>
          اطلاعات حساب کاربری شما به‌زودی در این بخش نمایش داده می‌شود.
        </p>

        <div className={styles.actions}>
          <a href="/" className={styles.link}>
            بازگشت به صفحه اصلی
          </a>
        </div>
      </div>
    </div>
  );
}
