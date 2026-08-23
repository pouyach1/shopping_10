import { Link } from 'react-router-dom';

import { formatPrice } from '../../lib/formatCurrency';
import { readOrderSnapshot } from '../../lib/orderSnapshot';

import styles from './OrderConfirmation.module.css';

export function OrderConfirmation() {
  const order = readOrderSnapshot();

  if (!order) {
    return (
      <div className={styles.page} dir="rtl">
        <div className={styles.card}>
          <header className={styles.header}>
            <span className={styles.eyebrow}>LUXORA</span>
            <h1 className={styles.title}>سفارشی یافت نشد</h1>
          </header>
          <span className={styles.divider} aria-hidden="true" />
          <p className={styles.description}>
            اطلاعات سفارش در دسترس نیست. لطفاً از فروشگاه خرید کنید یا
            به صفحه اصلی بازگردید.
          </p>
          <div className={styles.actions}>
            <Link to="/shop" className={styles.primaryLink}>
              رفتن به فروشگاه
            </Link>
            <Link to="/" className={styles.secondaryLink}>
              صفحه اصلی
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.card}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>LUXORA</span>
          <h1 className={styles.title}>سفارش شما ثبت شد</h1>
        </header>

        <span className={styles.divider} aria-hidden="true" />

        <p className={styles.lead}>
          {order.customerName ? `${order.customerName} عزیز، ` : ''}
          از خرید شما سپاسگزاریم. جزئیات سفارش در زیر آمده است.
        </p>

        <dl className={styles.summary}>
          <div className={styles.row}>
            <dt>شماره سفارش</dt>
            <dd>{order.orderId}</dd>
          </div>
          <div className={styles.row}>
            <dt>تعداد اقلام</dt>
            <dd>{order.itemCount}</dd>
          </div>
          <div className={styles.row}>
            <dt>جمع جزء</dt>
            <dd>{formatPrice(order.subtotal)} تومان</dd>
          </div>
          <div className={styles.row}>
            <dt>هزینه ارسال</dt>
            <dd>{formatPrice(order.shipping)} تومان</dd>
          </div>
          <div className={`${styles.row} ${styles.totalRow}`}>
            <dt>مبلغ کل</dt>
            <dd>{formatPrice(order.total)} تومان</dd>
          </div>
        </dl>

        <p className={styles.note}>
          اتصال درگاه پرداخت در فاز بعدی فعال می‌شود. این صفحه برای
          نمایش جریان تکمیل سفارش در دمو طراحی شده است.
        </p>

        <div className={styles.actions}>
          <Link to="/shop" className={styles.primaryLink}>
            ادامه خرید
          </Link>
          <Link to="/" className={styles.secondaryLink}>
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </div>
  );
}
