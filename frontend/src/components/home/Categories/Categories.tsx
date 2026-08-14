import { useScrollReveal } from '../../../hooks/useScrollReveal';
import type { CategoryItem } from '../../../pages/Home/types';
import styles from './Categories.module.css';

interface CategoriesProps {
  title: string;
  description?: string;
  categories: CategoryItem[];
}

export function Categories({ title, description, categories }: CategoriesProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      className={`${styles.categories} ${isVisible ? styles.visible : ''}`}
      aria-label={title}
    >
      <div className={styles.categoriesInner}>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
        <div className={styles.divider} aria-hidden="true" />
        <div className={styles.grid}>
          {categories.map((category, index) => (
            <a
              key={category.id}
              href={category.href}
              className={styles.categoryItem}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <div className={styles.imageWrapper}>
                <img
                  src={category.imageSrc}
                  alt={category.imageAlt}
                  className={styles.image}
                  loading="lazy"
                />
                <div className={styles.overlay} aria-hidden="true" />
                <div className={styles.cardContent}>
                  <span className={styles.categoryName}>{category.name}</span>
                  <span className={styles.cardDivider} aria-hidden="true" />
                  <span className={styles.shopNow}>SHOP NOW</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
