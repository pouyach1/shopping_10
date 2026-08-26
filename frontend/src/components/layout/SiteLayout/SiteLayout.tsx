import { Outlet, useLocation } from 'react-router-dom';

import { Header } from '../Header';
import { Footer } from '../Footer';
import { footerColumns, navItems } from '../../../pages/Home/data';

import styles from './SiteLayout.module.css';

export function SiteLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className={styles.layout}>
      <a href="#main-content" className="skip-link">
        رد شدن به محتوای اصلی
      </a>

      <Header navItems={navItems} logo="لوکسورا" logoLatin="LUXORA" />

      <main
        id="main-content"
        className={`${styles.main} ${isHome ? '' : styles.mainOffset}`.trim()}
      >
        <div
          // Nested /profile/* routes share one page enter so section slides
          // are not cancelled by remounting the whole storefront page.
          key={
            location.pathname.startsWith('/profile')
              ? '/profile'
              : location.pathname
          }
          className={styles.page}
        >
          <Outlet />
        </div>
      </main>

      <Footer
        brandName="لوکسورا"
        brandTagline="زیبایی بی‌زمان، برای لحظه‌های ماندگار."
        columns={footerColumns}
      />
    </div>
  );
}
