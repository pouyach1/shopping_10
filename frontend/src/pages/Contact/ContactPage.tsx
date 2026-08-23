import { type FormEvent, useState } from 'react';
import { Mail, MapPin, Phone, Clock } from 'lucide-react';

import content from '../content/ContentPage.module.css';
import styles from './ContactPage.module.css';

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className={content.page} dir="rtl">
      <section className={content.hero}>
        <div className={content.heroGlow} aria-hidden="true" />
        <div className={content.heroInner}>
          <span className={content.eyebrow}>
            <span className={content.eyebrowLine} aria-hidden="true" />
            CONTACT
            <span className={content.eyebrowLine} aria-hidden="true" />
          </span>
          <h1 className={content.heroTitle}>
            تماس با <em>لوکسورا</em>
          </h1>
          <p className={content.heroLead}>
            تیم خدمات مشتریان ما آماده پاسخ‌گویی به پرسش‌های شما درباره سفارش،
            ارسال و محصولات است.
          </p>
        </div>
      </section>

      <div className={`${content.content} ${styles.layout}`}>
        <section className={styles.infoPanel} aria-label="اطلاعات تماس">
          <span className={content.sectionEyebrow}>CONCIERGE</span>
          <h2 className={content.sectionTitle}>خدمات مشتریان اختصاصی</h2>
          <p className={content.sectionBody}>
            تجربه خرید لوکسورا با همراهی شخصی ادامه می‌یابد. پیام خود را ارسال
            کنید؛ در کوتاه‌ترین زمان ممکن پاسخ می‌دهیم.
          </p>

          <ul className={styles.infoList}>
            <li>
              <Mail size={18} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <strong>ایمیل</strong>
                <span>concierge@luxora.ir</span>
              </div>
            </li>
            <li>
              <Phone size={18} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <strong>تلفن</strong>
                <span dir="ltr">۰۲۱-۹۱۰۰۴۵۶۷</span>
              </div>
            </li>
            <li>
              <Clock size={18} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <strong>ساعات پاسخ‌گویی</strong>
                <span>شنبه تا پنجشنبه، ۹ تا ۱۸</span>
              </div>
            </li>
            <li>
              <MapPin size={18} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <strong>دفتر مرکزی</strong>
                <span>تهران، خیابان ولیعصر، برج لوکسورا</span>
              </div>
            </li>
          </ul>
        </section>

        <section className={styles.formPanel} aria-label="فرم تماس">
          {submitted ? (
            <div className={styles.success} role="status">
              <span className={content.sectionEyebrow}>THANK YOU</span>
              <h2 className={content.sectionTitle}>پیام شما دریافت شد</h2>
              <p className={content.sectionBody}>
                از همراهی شما سپاسگزاریم. کارشناسان ما به‌زودی با شما تماس
                خواهند گرفت.
              </p>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setSubmitted(false)}
              >
                ارسال پیام جدید
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <span className={content.sectionEyebrow}>MESSAGE</span>
              <h2 className={content.sectionTitle}>پیام خود را بنویسید</h2>

              <div className={styles.row}>
                <label className={styles.field}>
                  <span>نام و نام خانوادگی</span>
                  <input name="name" type="text" required placeholder="نام شما" />
                </label>
                <label className={styles.field}>
                  <span>شماره موبایل</span>
                  <input
                    name="phone"
                    type="tel"
                    required
                    placeholder="۰۹۱۲xxxxxxx"
                    dir="ltr"
                  />
                </label>
              </div>

              <label className={styles.field}>
                <span>ایمیل</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@email.com"
                  dir="ltr"
                />
              </label>

              <label className={styles.field}>
                <span>موضوع</span>
                <select name="topic" defaultValue="order" required>
                  <option value="order">پیگیری سفارش</option>
                  <option value="shipping">ارسال و تحویل</option>
                  <option value="product">پرسش درباره محصول</option>
                  <option value="other">سایر موارد</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>پیام</span>
                <textarea
                  name="message"
                  required
                  rows={5}
                  placeholder="پیام خود را بنویسید..."
                />
              </label>

              <button type="submit" className={styles.submit}>
                ارسال پیام
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
