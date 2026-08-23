import { CatalogResults } from '../../components/catalog/CatalogResults';
import styles from '../Search/Search.module.css';

export function ShopPage() {
  return (
    <div className={styles.page} dir="rtl">
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            LUXORA SHOP
            <span className={styles.eyebrowLine} aria-hidden="true" />
          </span>
          <h1>
            فروشگاه <em>لوکسورا</em>
          </h1>
          <p className={styles.heroDescription}>
            مجموعه‌ای منتخب از پوشاک، اکسسوری و انتخاب‌های فصلی با
            جزئیات ظریف و کیفیت ممتاز.
          </p>
        </div>
      </section>

      <CatalogResults title="همه محصولات" eyebrow="SHOP ALL" />
    </div>
  );
}
