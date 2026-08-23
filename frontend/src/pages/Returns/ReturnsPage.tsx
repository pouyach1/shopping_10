import { Link } from 'react-router-dom';

import styles from '../content/ContentPage.module.css';

export function ReturnsPage() {
  return (
    <div className={styles.page} dir="rtl">
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            RETURNS
            <span className={styles.eyebrowLine} aria-hidden="true" />
          </span>
          <h1 className={styles.heroTitle}>
            بازگشت و <em>تعویض</em>
          </h1>
          <p className={styles.heroLead}>
            اگر محصول با انتظار شما هم‌خوان نبود، با آرامش آن را بازگردانید یا
            تعویض کنید.
          </p>
        </div>
      </section>

      <div className={styles.content}>
        <span className={styles.divider} aria-hidden="true" />

        <section className={styles.section}>
          <span className={styles.sectionEyebrow}>POLICY</span>
          <h2 className={styles.sectionTitle}>سیاست بازگشت ۷ روزه</h2>
          <p className={styles.sectionBody}>
            تا ۷ روز پس از دریافت سفارش، می‌توانید درخواست بازگشت یا تعویض ثبت
            کنید؛ به شرط آن‌که محصول استفاده نشده، بدون بو و آسیب، و با برچسب‌ها
            و بسته‌بندی اصلی باشد.
          </p>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionEyebrow}>ELIGIBILITY</span>
          <h2 className={styles.sectionTitle}>شرایط پذیرش</h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              محصول نباید شسته یا استفاده شده باشد.
            </li>
            <li className={styles.listItem}>
              برچسب‌ها، کارت اصالت و بسته‌بندی باید کامل باشد.
            </li>
            <li className={styles.listItem}>
              اقلام نهایی‌فروش، زیرپوشش و محصولات بهداشتی قابل بازگشت نیستند.
            </li>
            <li className={styles.listItem}>
              برای تعویض سایز، موجودی سایز جایگزین بررسی می‌شود.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionEyebrow}>STEPS</span>
          <h2 className={styles.sectionTitle}>مراحل بازگشت</h2>
          <div className={styles.grid}>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>۱. درخواست</h3>
              <p className={styles.cardBody}>
                از طریق حساب کاربری یا صفحه تماس، شماره سفارش و دلیل بازگشت را
                اعلام کنید.
              </p>
            </article>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>۲. ارسال</h3>
              <p className={styles.cardBody}>
                پس از تأیید، کالا را با بسته‌بندی مناسب به آدرس اعلام‌شده ارسال
                کنید.
              </p>
            </article>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>۳. استرداد</h3>
              <p className={styles.cardBody}>
                پس از بررسی کیفیت، مبلغ به همان روش پرداخت ظرف ۳ تا ۷ روز کاری
                بازمی‌گردد.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionEyebrow}>EXCHANGE</span>
          <h2 className={styles.sectionTitle}>تعویض کالا</h2>
          <p className={styles.sectionBody}>
            تعویض سایز یا رنگ در صورت موجودی امکان‌پذیر است. اگر کالای جایگزین
            موجود نباشد، مبلغ به حساب شما بازگردانده می‌شود.
          </p>
          <p className={styles.sectionBody}>
            برای راهنمایی بیشتر به <Link to="/faq">سوالات متداول</Link> یا{' '}
            <Link to="/contact">تماس با ما</Link> مراجعه کنید. اطلاعات ارسال در{' '}
            <Link to="/shipping">صفحه ارسال</Link> آمده است.
          </p>
        </section>
      </div>
    </div>
  );
}
