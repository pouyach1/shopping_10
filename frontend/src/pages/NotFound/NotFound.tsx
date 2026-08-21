import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.container}>
        <span className={styles.eyebrow}>LUXORA</span>
        <p className={styles.code}>۴۰۴</p>
        <h1 className={styles.title}>صفحه پیدا نشد</h1>
        <p className={styles.description}>
          متأسفیم، صفحه‌ای که دنبال آن هستید وجود ندارد یا جابه‌جا شده است.
        </p>
        <a href="/" className={styles.link}>
          بازگشت به صفحه اصلی
        </a>
      </div>
    </main>
  );
}
