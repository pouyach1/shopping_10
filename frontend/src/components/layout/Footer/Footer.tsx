<<<<<<< HEAD
import { useState, type CSSProperties, type FormEvent } from 'react';
import { useScrollReveal } from '../../../hooks/useScrollReveal';
=======
import { useState, type FormEvent } from 'react';
>>>>>>> ea79e67 (checkpoint: luxury cart layout stage 2 complete)
import { SocialIcon } from '../../ui/SocialIcon';
import type { FooterColumn } from '../../../pages/Home/types';
import styles from './Footer.module.css';

interface FooterProps {
  brandName: string;
  brandTagline?: string;
  columns: FooterColumn[];
}

const socialLinks = [
<<<<<<< HEAD
  { name: 'instagram' as const, label: 'اینستاگرام', href: 'https://instagram.com' },
  { name: 'facebook' as const, label: 'فیس‌بوک', href: 'https://facebook.com' },
  { name: 'twitter' as const, label: 'توییتر', href: 'https://twitter.com' },
  { name: 'youtube' as const, label: 'یوتیوب', href: 'https://youtube.com' },
];

export function Footer({ brandName, brandTagline, columns }: FooterProps) {
=======
  {
    id: 'instagram',
    label: 'Instagram',
    icon: 'instagram',
    href: 'https://instagram.com',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: 'facebook',
    href: 'https://facebook.com',
  },
  {
    id: 'twitter',
    label: 'X / Twitter',
    icon: 'twitter',
    href: 'https://twitter.com',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: 'youtube',
    href: 'https://youtube.com',
  },
] as const;

export function Footer({
  brandName,
  brandTagline,
  columns,
}: FooterProps) {
>>>>>>> ea79e67 (checkpoint: luxury cart layout stage 2 complete)
  const [email, setEmail] = useState('');
  const newsletterReveal = useScrollReveal<HTMLElement>({ threshold: 0.12 });
  const contentReveal = useScrollReveal<HTMLElement>({ threshold: 0.08 });

<<<<<<< HEAD
  const handleSubscribe = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
=======
  const handleSubscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
>>>>>>> ea79e67 (checkpoint: luxury cart layout stage 2 complete)
    setEmail('');
  };

  return (
    <footer className={styles.footer} dir="rtl">
      <section
<<<<<<< HEAD
        ref={newsletterReveal.ref}
        className={`${styles.newsletter} ${newsletterReveal.isVisible ? styles.isVisible : ''}`}
        aria-labelledby="footer-newsletter-title"
      >
        <div className={styles.newsletterInner}>
          <div className={styles.newsletterCopy}>
            <span className={styles.eyebrow}>LUXORA PRIVÉ</span>
            <h2 id="footer-newsletter-title" className={styles.newsletterTitle}>
              وارد دنیای <span>LUXORA</span> شوید.
            </h2>
            <p className={styles.newsletterDescription}>
              برای دریافت مجموعه‌های جدید، انتخاب‌های اختصاصی و پیشنهادهای ویژه همراه ما باشید.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className={styles.newsletterForm}>
            <label htmlFor="footer-email" className="sr-only">
              ایمیل شما
            </label>
            <div className={styles.inputWrap}>
              <input
                id="footer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ایمیل شما"
                className={styles.input}
                autoComplete="email"
                required
              />
            </div>
            <button type="submit" className={styles.subscribeButton}>
              <span>عضویت</span>
              <span aria-hidden="true" className={styles.buttonArrow}>↗</span>
=======
        className={styles.newsletter}
        aria-labelledby="newsletter-title"
      >
        <div className={styles.newsletterInner}>
          <div className={styles.newsletterContent}>
            <span className={styles.eyebrow}>LUXORA PRIVÉ</span>

            <h2 id="newsletter-title" className={styles.newsletterTitle}>
              وارد دنیای LUXORA شوید.
            </h2>

            <p className={styles.newsletterDescription}>
              برای دریافت مجموعه‌های جدید و انتخاب‌های اختصاصی همراه ما باشید.
            </p>
          </div>

          <form
            className={styles.newsletterForm}
            onSubmit={handleSubscribe}
          >
            <label htmlFor="footer-email" className={styles.srOnly}>
              ایمیل شما
            </label>

            <input
              id="footer-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ایمیل شما"
              autoComplete="email"
              required
              className={styles.input}
            />

            <button
              type="submit"
              className={styles.subscribeButton}
            >
              عضویت
>>>>>>> ea79e67 (checkpoint: luxury cart layout stage 2 complete)
            </button>
          </form>
        </div>
      </section>

<<<<<<< HEAD
      <section
        ref={contentReveal.ref}
        className={`${styles.mainFooter} ${contentReveal.isVisible ? styles.isVisible : ''}`}
        aria-label="اطلاعات LUXORA"
      >
        <span className={styles.watermark} aria-hidden="true">
          LUXORA
        </span>

        <div className={styles.footerInner}>
          <div className={`${styles.brandColumn} ${styles.revealItem}`}>
            <a href="/" className={styles.brandName} aria-label={`${brandName} - صفحه اصلی`}>
              {brandName}
            </a>
            <span className={styles.brandMeta}>LUXORA / PRIVATE COLLECTION</span>
            {brandTagline && <p className={styles.tagline}>{brandTagline}</p>}
            <span className={styles.established}>EST. 2026</span>
          </div>

          {columns.map((column, index) => (
            <div
              key={column.id}
              className={`${styles.column} ${styles.revealItem}`}
              style={{ '--reveal-delay': `${120 + index * 80}ms` } as CSSProperties}
            >
              <div className={styles.titleRow}>
                <span className={styles.titleAccent} aria-hidden="true" />
                <h3 className={styles.columnTitle}>{column.title}</h3>
              </div>
              <ul className={styles.linkList}>
                {column.links.map((link) => (
                  <li key={link.id}>
                    <a href={link.href} className={styles.link}>
                      <span>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>

              {column.id === 'about' && (
                <div className={styles.socialBlock}>
                  <span className={styles.socialLabel}>دنبال‌مان کنید</span>
                  <div className={styles.socialLinks}>
                    {socialLinks.map((social) => (
                      <a
                        key={social.name}
                        href={social.href}
                        className={styles.socialLink}
                        aria-label={social.label}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <SocialIcon name={social.name} size={17} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.copyright}>
          <p>© {new Date().getFullYear()} {brandName}. تمامی حقوق محفوظ است.</p>
          <nav className={styles.legalLinks} aria-label="لینک‌های حقوقی">
            <a href="/privacy">حریم خصوصی</a>
            <a href="/terms">شرایط استفاده</a>
            <a href="/returns">بازگشت کالا</a>
          </nav>
        </div>
      </section>
=======
      <div className={styles.main}>
        <div className={styles.inner}>
          <div className={styles.brandColumn}>
            <a href="/" className={styles.brandName}>
              {brandName}
            </a>

            {brandTagline && (
              <p className={styles.tagline}>{brandTagline}</p>
            )}

            <span className={styles.est}>EST. 2026</span>
          </div>

          <nav className={styles.navigation} aria-label="Footer navigation">
            {columns.slice(0, 2).map((column) => (
              <div key={column.id} className={styles.column}>
                <h3 className={styles.columnTitle}>
                  {column.title}
                </h3>

                <ul className={styles.linkList}>
                  {column.links.map((link) => (
                    <li key={link.id}>
                      <a href={link.href} className={styles.link}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className={styles.connect}>
            <h3 className={styles.columnTitle}>ارتباط</h3>

            <div className={styles.socialLinks}>
              {socialLinks.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  className={styles.socialLink}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SocialIcon name={social.icon} size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>
            © {new Date().getFullYear()} {brandName}
          </p>

          <div className={styles.legalLinks}>
            <a href="/privacy">حریم خصوصی</a>
            <a href="/terms">شرایط استفاده</a>
          </div>
        </div>
      </div>
>>>>>>> ea79e67 (checkpoint: luxury cart layout stage 2 complete)
    </footer>
  );
}
