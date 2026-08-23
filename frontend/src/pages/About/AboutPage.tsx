import { Link } from 'react-router-dom';

import styles from '../content/ContentPage.module.css';

export function AboutPage() {
  return (
    <div className={styles.page} dir="rtl">
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            OUR STORY
            <span className={styles.eyebrowLine} aria-hidden="true" />
          </span>
          <h1 className={styles.heroTitle}>
            داستان <em>لوکسورا</em>
          </h1>
          <p className={styles.heroLead}>
            لوکسورا از یک ایده ساده آغاز شد: پوشاکی که با دقت ساخته شود،
            با وقار پوشیده شود و در گذر زمان معنا پیدا کند.
          </p>
        </div>
      </section>

      <div className={styles.content}>
        <span className={styles.divider} aria-hidden="true" />

        <section className={styles.section}>
          <span className={styles.sectionEyebrow}>ORIGIN</span>
          <h2 className={styles.sectionTitle}>آغاز یک نگاه تازه به لوکس بودن</h2>
          <p className={styles.sectionBody}>
            در جهانی که مد اغلب به سرعت و فراوانی گرایش دارد، لوکسورا مسیر
            دیگری را انتخاب کرده است؛ مسیری که در آن کیفیت بر کمیت، و معنا بر
            هیاهو مقدم است. هر مجموعه، روایتی از سکوت، جزئیات و زیبایی ماندگار
            است.
          </p>
          <p className={styles.sectionBody}>
            ما باور داریم لوکس بودن در نمایش افراطی نیست؛ در انتخاب‌های آگاهانه،
            پارچه‌های اصیل و دوختی است که احترام به بدن و سبک زندگی شما را نشان
            می‌دهد.
          </p>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionEyebrow}>CRAFTSMANSHIP</span>
          <h2 className={styles.sectionTitle}>صنعتگری، در تار و پود هر قطعه</h2>
          <p className={styles.sectionBody}>
            از انتخاب الیاف تا آخرین دوخت، هر مرحله با وسواس دنبال می‌شود.
            پارچه‌ها برای لمس، دوام و حرکت بررسی می‌شوند و الگوها برای تناسب
            طبیعی بدن طراحی می‌گردند.
          </p>

          <div className={styles.grid} style={{ marginTop: 28 }}>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>انتخاب مواد</h3>
              <p className={styles.cardBody}>
                ابریشم، پشم، کشمیر و لینن با استانداردهای دقیق کیفیت و اصالت
                گزینش می‌شوند.
              </p>
            </article>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>دوخت دقیق</h3>
              <p className={styles.cardBody}>
                خطوط تمیز، درزهای پنهان و اتمام‌های ظریف، هویت بصری لوکسورا را
                شکل می‌دهند.
              </p>
            </article>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>کنترل کیفیت</h3>
              <p className={styles.cardBody}>
                هر محصول پیش از عرضه، از نظر تناسب، رنگ و دوام بررسی می‌شود.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionEyebrow}>PHILOSOPHY</span>
          <h2 className={styles.sectionTitle}>فلسفه برند</h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              زیبایی بی‌زمان بر ترندهای زودگذر اولویت دارد.
            </li>
            <li className={styles.listItem}>
              کمد لباس باید کمتر، اما دقیق‌تر و باکیفیت‌تر باشد.
            </li>
            <li className={styles.listItem}>
              تجربه خرید، از کشف تا تحویل، باید آرام و محترمانه باشد.
            </li>
            <li className={styles.listItem}>
              لباس خوب، اعتمادبه‌نفس را بلند می‌کند، نه صدای برند را.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionEyebrow}>INVITATION</span>
          <h2 className={styles.sectionTitle}>به دنیای لوکسورا خوش آمدید</h2>
          <p className={styles.sectionBody}>
            اگر به دنبال پوشاکی هستید که در سکوت بدرخشد، مجموعه ما را کشف کنید.
          </p>
          <p className={styles.sectionBody}>
            <Link to="/shop" style={{ color: '#1a1b1e', textDecoration: 'underline' }}>
              مشاهده فروشگاه
            </Link>
            {' · '}
            <Link to="/contact" style={{ color: '#1a1b1e', textDecoration: 'underline' }}>
              تماس با ما
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
