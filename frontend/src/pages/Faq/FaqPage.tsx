import { Accordion, type AccordionItem } from '../../components/ui/Accordion';
import { Link } from 'react-router-dom';

import { FREE_SHIPPING_THRESHOLD } from '../../config/shipping';
import { formatPrice } from '../../lib/formatCurrency';

import styles from '../content/ContentPage.module.css';

const faqItems: AccordionItem[] = [
  {
    id: 'shipping-1',
    question: 'هزینه و زمان ارسال چقدر است؟',
    answer: (
      <p>
        سفارش‌های از {formatPrice(FREE_SHIPPING_THRESHOLD)} تومان به بالا ارسال
        رایگان دارند. ارسال عادی ۲ تا ۴ روز کاری و ارسال سریع ۱ تا ۲ روز کاری
        است. جزئیات کامل در صفحه{' '}
        <Link to="/shipping">ارسال و تحویل</Link> آمده است.
      </p>
    ),
  },
  {
    id: 'shipping-2',
    question: 'آیا امکان ارسال به تمام شهرها وجود دارد؟',
    answer: (
      <p>
        بله، لوکسورا به سراسر ایران ارسال می‌کند. زمان دقیق تحویل بسته به شهر
        مقصد و روش ارسال انتخابی شما متفاوت است.
      </p>
    ),
  },
  {
    id: 'payment-1',
    question: 'چه روش‌های پرداختی پشتیبانی می‌شود؟',
    answer: (
      <p>
        در حال حاضر پرداخت آنلاین از طریق درگاه امن بانکی و پرداخت در محل
        (برای شهرهای منتخب) در دسترس است. تمامی تراکنش‌ها رمزنگاری می‌شوند.
      </p>
    ),
  },
  {
    id: 'payment-2',
    question: 'آیا امکان پرداخت اقساطی وجود دارد؟',
    answer: (
      <p>
        برای سفارش‌های خاص، امکان هماهنگی پرداخت اقساطی از طریق تیم خدمات
        مشتریان فراهم است. لطفاً از صفحه <Link to="/contact">تماس با ما</Link>{' '}
        پیام بگذارید.
      </p>
    ),
  },
  {
    id: 'orders-1',
    question: 'چگونه وضعیت سفارش را پیگیری کنم؟',
    answer: (
      <p>
        پس از ثبت سفارش، کد پیگیری برای شما ارسال می‌شود. همچنین می‌توانید از
        بخش حساب کاربری، وضعیت سفارش را مشاهده کنید.
      </p>
    ),
  },
  {
    id: 'orders-2',
    question: 'آیا می‌توانم سفارش را لغو یا ویرایش کنم؟',
    answer: (
      <p>
        تا پیش از آماده‌سازی سفارش برای ارسال، امکان لغو یا ویرایش وجود دارد.
        پس از خروج از انبار، فرآیند بازگشت کالا طبق سیاست بازگشت انجام می‌شود.
      </p>
    ),
  },
  {
    id: 'returns-1',
    question: 'شرایط بازگشت کالا چیست؟',
    answer: (
      <p>
        تا ۷ روز پس از تحویل، در صورت سالم بودن محصول و حفظ برچسب‌ها، امکان
        بازگشت یا تعویض وجود دارد. جزئیات در صفحه{' '}
        <Link to="/returns">بازگشت کالا</Link> آمده است.
      </p>
    ),
  },
  {
    id: 'care-1',
    question: 'چگونه از محصولات لوکسورا نگهداری کنم؟',
    answer: (
      <p>
        برچسب مراقبت هر محصول را بررسی کنید. به‌طور کلی، شست‌وشوی ملایم، خشک
        کردن در سایه و نگهداری روی چوب‌لباسی مناسب توصیه می‌شود. برای پارچه‌های
        ظریف مانند ابریشم و کشمیر، شست‌وشوی حرفه‌ای پیشنهاد می‌شود.
      </p>
    ),
  },
  {
    id: 'size-1',
    question: 'چگونه سایز مناسب را انتخاب کنم؟',
    answer: (
      <p>
        از دکمه «راهنمای سایز» در صفحه محصول برای مشاهده توضیح سایزهای موجود
        استفاده کنید. در صورت تردید، با خدمات مشتریان تماس بگیرید تا راهنمایی
        شخصی دریافت کنید.
      </p>
    ),
  },
];

export function FaqPage() {
  return (
    <div className={styles.page} dir="rtl">
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            FAQ
            <span className={styles.eyebrowLine} aria-hidden="true" />
          </span>
          <h1 className={styles.heroTitle}>
            سوالات <em>متداول</em>
          </h1>
          <p className={styles.heroLead}>
            پاسخ پرسش‌های رایج درباره ارسال، پرداخت، سفارش و مراقبت از محصولات
            لوکسورا.
          </p>
        </div>
      </section>

      <div className={`${styles.content} ${styles.narrow}`}>
        <span className={styles.divider} aria-hidden="true" />
        <Accordion items={faqItems} />

        <section className={styles.section} style={{ marginTop: 48 }}>
          <span className={styles.sectionEyebrow}>STILL NEED HELP?</span>
          <h2 className={styles.sectionTitle}>پاسخ خود را پیدا نکردید؟</h2>
          <p className={styles.sectionBody}>
            تیم concierge لوکسورا آماده کمک است.{' '}
            <Link to="/contact">از صفحه تماس</Link> پیام بگذارید یا با شماره
            پشتیبانی تماس بگیرید.
          </p>
        </section>
      </div>
    </div>
  );
}
