import styles from './ShippingForm.module.css';

export function ShippingForm() {
  return (
    <section className={styles.section}>
      <h2>اطلاعات ارسال</h2>
      <div className={styles.grid}>
        <input placeholder="آدرس" />
        <input placeholder="شهر" />
        <input placeholder="کد پستی" />
      </div>
    </section>
  );
}
