import { Link } from 'react-router-dom';

import styles from '../content/ContentPage.module.css';

export function ShippingPage() {
  return (
    <div className={styles.page} dir="rtl">
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            DELIVERY
            <span className={styles.eyebrowLine} aria-hidden="true" />
          </span>
          <h1 className={styles.heroTitle}>
            ارسال و <em>تحویل</em>
          </h1>
          <p className={styles.heroLead}>
            سفارش شما با دقت بسته‌بندی و در کوتاه‌ترین زمان ممکن به دستتان
            می‌رسد.
          </p>
        </div>
      </section>

      <div className={styles.content}>
        <span className={styles.divider} aria-hidden="true" />

        <section className={styles.section}>
          <span className={styles.sectionEyebrow}>OPTIONS</span>
          <h2 className={styles.sectionTitle}>روش‌های ارسال</h2>
          <div className={styles.grid}>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>ارسال عادی</h3>
              <p className={styles.cardBody}>
                ۲ تا ۴ روز کاری · هزینه استاندارد بر اساس شهر مقصد محاسبه
                می‌شود.
              </p>
            </article>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>ارسال سریع</h3>
              <p className={styles.cardBody}>
                ۱ تا ۲ روز کاری · مناسب برای سفارش‌های فوری در شهرهای اصلی.
              </p>
            </article>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>ارسال رایگان</h3>
              <p className={styles.cardBody}>
                برای سفارش‌های بالای ۵ میلیون تومان، ارسال در سراسر کشور رایگان
                است.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionEyebrow}>PROCESS</span>
          <h2 className={styles.sectionTitle}>فرآیند آماده‌سازی و تحویل</h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              پس از ثبت سفارش، موجودی و کیفیت محصول بررسی می‌شود.
            </li>
            <li className={styles.listItem}>
              بسته‌بندی با پوشش محافظ و جعبه اختصاصی لوکسورا انجام می‌شود.
            </li>
            <li className={styles.listItem}>
              کد رهگیری برای شما پیامک و ایمیل می‌شود.
            </li>
            <li className={styles.listItem}>
              تحویل در آدرس ثبت‌شده، در ساعات کاری انجام می‌گیرد.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionEyebrow}>NOTES</span>
          <h2 className={styles.sectionTitle}>نکات مهم</h2>
          <p className={styles.sectionBody}>
            در روزهای تعطیل رسمی و اوج فروش فصلی، زمان ارسال ممکن است کمی
            افزایش یابد. لطفاً آدرس و شماره تماس را دقیق وارد کنید تا تحویل بدون
            تأخیر انجام شود.
          </p>
          <p className={styles.sectionBody}>
            برای بازگشت یا تعویض کالا، صفحه{' '}
            <Link to="/returns">بازگشت کالا</Link> را مطالعه کنید. پرسش‌های
            بیشتر در <Link to="/faq">سوالات متداول</Link> پاسخ داده شده‌اند.
          </p>
        </section>
      </div>
    </div>
  );
}
