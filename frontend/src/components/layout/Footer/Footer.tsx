import { useState } from 'react';
import { SocialIcon } from '../../ui/SocialIcon';
import type { FooterColumn } from '../../../pages/Home/types';
import styles from './Footer.module.css';

interface FooterProps {
  brandName: string;
  brandTagline?: string;
  columns: FooterColumn[];
}

export function Footer({ brandName, brandTagline, columns }: FooterProps) {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail('');
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.brandColumn}>
          <a href="/" className={styles.brandName}>
            {brandName}
          </a>
          {brandTagline && <p className={styles.tagline}>{brandTagline}</p>}
          <div className={styles.socialLinks}>
            <a
              href="https://instagram.com"
              className={styles.socialLink}
              aria-label="اینستاگرام"
              target="_blank"
              rel="noopener noreferrer"
            >
              <SocialIcon name="instagram" size={18} />
            </a>
            <a
              href="https://facebook.com"
              className={styles.socialLink}
              aria-label="فیس‌بوک"
              target="_blank"
              rel="noopener noreferrer"
            >
              <SocialIcon name="facebook" size={18} />
            </a>
            <a
              href="https://twitter.com"
              className={styles.socialLink}
              aria-label="توییتر"
              target="_blank"
              rel="noopener noreferrer"
            >
              <SocialIcon name="twitter" size={18} />
            </a>
            <a
              href="https://youtube.com"
              className={styles.socialLink}
              aria-label="یوتیوب"
              target="_blank"
              rel="noopener noreferrer"
            >
              <SocialIcon name="youtube" size={18} />
            </a>
          </div>
        </div>

        {columns.map((column) => (
          <div key={column.id} className={styles.column}>
            <h3 className={styles.columnTitle}>{column.title}</h3>
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

        <div className={styles.newsletterColumn}>
          <h3 className={styles.columnTitle}>خبرنامه</h3>
          <p className={styles.newsletterDescription}>
            برای دریافت تخفیف‌های ویژه و محصولات جدید عضو شوید.
          </p>
          <form onSubmit={handleSubscribe} className={styles.newsletterForm}>
            <label htmlFor="footer-email" className="sr-only">
              ایمیل شما
            </label>
            <input
              id="footer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ایمیل خود را وارد کنید"
              className={styles.input}
              required
            />
            <button type="submit" className={styles.subscribeButton}>
              عضویت
            </button>
          </form>
        </div>
      </div>

      <div className={styles.copyright}>
        <p>
          &copy; {new Date().getFullYear()} {brandName}. تمامی حقوق محفوظ است.
        </p>
      </div>
    </footer>
  );
}
