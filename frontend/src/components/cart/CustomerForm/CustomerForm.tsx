import styles from './CustomerForm.module.css';

export function CustomerForm() {
  return (
    <section className={styles.section}>
      <h2>اطلاعات مشتری</h2>
      <div className={styles.grid}>
        <input placeholder="نام و نام خانوادگی" />
        <input placeholder="ایمیل" />
        <input placeholder="شماره تماس" />
      </div>
    </section>
  );
}
