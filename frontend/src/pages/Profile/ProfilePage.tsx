import styles from './ProfilePage.module.css';

export function ProfilePage() {
  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.container}>
        <span className={styles.eyebrow}>LUXORA</span>
        <h1 className={styles.title}>حساب کاربری</h1>
        <p className={styles.description}>
          اطلاعات حساب کاربری شما به‌زودی در این بخش نمایش داده می‌شود.
        </p>
        <a href="/" className={styles.link}>
          بازگشت به صفحه اصلی
        </a>
      </div>
    </main>
  );
}
