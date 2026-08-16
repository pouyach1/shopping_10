import styles from './PaymentForm.module.css';

export function PaymentForm() {
  return (
    <section className={styles.section}>
      <h2>اطلاعات پرداخت</h2>
      <div className={styles.grid}>
        <input placeholder="شماره کارت" />
        <input placeholder="CVV" />
        <input placeholder="تاریخ انقضا" />
      </div>
    </section>
  );
}
