import { useId, useState, type FormEvent } from 'react';
import { SocialIcon } from '../../ui/SocialIcon';
import type { FooterColumn } from '../../../pages/Home/types';
import {
  submitNewsletterEmail,
  validateNewsletterEmail,
} from '../../../services/newsletter';
import styles from './Footer.module.css';

interface FooterProps {
  brandName: string;
  brandTagline?: string;
  columns: FooterColumn[];
}

type NewsletterStatus = 'idle' | 'submitting' | 'success' | 'error';

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
  const feedbackId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<NewsletterStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubscribe = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'submitting') return;

    const validationError = validateNewsletterEmail(email);
    if (validationError) {
      setStatus('error');
      setMessage(validationError);
      return;
    }

    setStatus('submitting');
    setMessage(null);

    try {
      const result = await submitNewsletterEmail(email);
      setStatus('success');
      setMessage(result.message);
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'ثبت ایمیل ممکن نشد. لطفاً دوباره تلاش کنید.',
      );
    }
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

          <form
            onSubmit={handleSubscribe}
            className={styles.newsletterForm}
            noValidate
            aria-busy={status === 'submitting'}
          >
            <label htmlFor="footer-email" className="sr-only">
              ایمیل شما
            </label>
            <input
              id="footer-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              disabled={status === 'submitting'}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === 'error' || status === 'success') {
                  setStatus('idle');
                  setMessage(null);
                }
              }}
              placeholder="ایمیل شما"
              className={styles.input}
              aria-invalid={status === 'error'}
              aria-describedby={message ? feedbackId : undefined}
            />
            <button
              type="submit"
              className={styles.subscribeButton}
              disabled={status === 'submitting'}
            >
              <span>{status === 'submitting' ? 'در حال ثبت...' : 'عضویت'}</span>
              <span className={styles.buttonArrow}>↗</span>
            </button>

            {message ? (
              <p
                id={feedbackId}
                className={
                  status === 'success'
                    ? styles.newsletterSuccess
                    : styles.newsletterError
                }
                role={status === 'error' ? 'alert' : 'status'}
              >
                {message}
              </p>
            ) : null}
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
