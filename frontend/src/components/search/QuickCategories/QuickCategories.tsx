import styles from './QuickCategories.module.css';
import { quickCategories } from '../../../pages/Search/data';

export function QuickCategories() {
  return (
    <div className={styles.categories}>
      <h3 className={styles.title}>دسته‌بندی‌های سریع</h3>
      <div className={styles.grid}>
        {quickCategories.map((category) => (
          <a key={category.id} href={category.href} className={styles.item}>
            <img src={category.imageSrc} alt={category.imageAlt} className={styles.image} loading="lazy" />
            <span className={styles.name}>{category.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
