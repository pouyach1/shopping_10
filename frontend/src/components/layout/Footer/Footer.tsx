import { useState, type FormEvent } from 'react';
import { SocialIcon } from '../../ui/SocialIcon';
import type { FooterColumn } from '../../../pages/Home/types';
import styles from './Footer.module.css';

interface FooterProps {
  brandName: string;
  brandTagline?: string;
  columns: FooterColumn[];
}

const socialLinks = [
  {
    name: 'instagram' as const,
    label: 'اینستاگرام',
    href: 'https://instagram.com',
  },
  {
    name: 'facebook' as const,
    label: 'فیس‌بوک',
    href: 'https://facebook.com',
  },
  {
    name: 'twitter' as const,
    label: 'توییتر',
    href: 'https://twitter.com',
  },
  {
    name: 'youtube' as const,
    label: 'یوتیوب',
    href: 'https://youtube.com',
  },
];

export function Footer({
  brandName,
  brandTagline,
  columns,
}: FooterProps) {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmail('');
  };

  return (
    <footer className={styles.footer} dir="rtl">
      <section className={styles.newsletter}>
        <div className={styles.newsletterInner}>
          <div className={styles.newsletterCopy}>
            <span className={styles.eyebrow}>LUXORA PRIVÉ</span>
            <h2 id="footer-newsletter-title" className={styles.newsletterTitle}>
              وارد دنیای <span>LUXORA</span> شوید.
            </h2>
            <p className={styles.newsletterDescription}>
              برای دریافت مجموعه‌های جدید، انتخاب‌های اختصاصی و پیشنهادهای ویژه
              همراه ما باشید.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className={styles.newsletterForm}>
            <label htmlFor="footer-email" className="sr-only">
              ایمیل شما
            </label>
            <input
              id="footer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ایمیل شما"
              className={styles.input}
              required
            />
            <button type="submit" className={styles.subscribeButton}>
              <span>عضویت</span>
              <span className={styles.buttonArrow}>↗</span>
            </button>
          </form>
        </div>
      </section>

      <section className={styles.mainFooter}>
        <span className={styles.watermark} aria-hidden="true">
          LUXORA
        </span>

        <div className={styles.footerInner}>
          <div className={styles.brandColumn}>
            <a href="/" className={styles.brandName}>
              {brandName}
            </a>
            <span className={styles.brandMeta}>LUXORA / PRIVATE COLLECTION</span>
            {brandTagline && <p className={styles.tagline}>{brandTagline}</p>}
            <span className={styles.established}>EST. 2026</span>

            <div className={styles.designerCredit}>
              <span className={styles.designerCreditLabel}>طراحی و توسعه</span>
              <span className={styles.designerCreditValue} aria-hidden="true">
                —
              </span>
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.id} className={styles.column}>
              <div className={styles.titleRow}>
                <span className={styles.titleAccent} />
                <h3 className={styles.columnTitle}>{column.title}</h3>
              </div>

              <ul className={styles.linkList}>
                {column.links.map((link) => (
                  <li key={link.id}>
                    <a href={link.href} className={styles.link}>
                      {link.label}
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
          <p>
            © {new Date().getFullYear()} {brandName}. تمامی حقوق محفوظ است.
          </p>
          <nav className={styles.legalLinks}>
            <a href="/privacy">حریم خصوصی</a>
            <a href="/terms">شرایط استفاده</a>
            <a href="/returns">بازگشت کالا</a>
          </nav>
        </div>
      </section>
    </footer>
  );
}
