import { Link } from 'react-router-dom';

import type { CategoryItem } from '../../../pages/Home/types';

import styles from './Categories.module.css';

interface CategoriesProps {
  title: string;
  description?: string;
  categories: CategoryItem[];
}

export function Categories({ title, description, categories }: CategoriesProps) {
  return (
    <section className={styles.categories} aria-labelledby="home-categories-title">
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 id="home-categories-title" className={styles.title}>
            {title}
          </h2>
          {description ? (
            <p className={styles.description}>{description}</p>
          ) : null}
        </div>

        <ul className={styles.grid}>
          {categories.map((category) => (
            <li
              key={category.id}
              className={
                category.id === 'accessories'
                  ? styles.spanWide
                  : undefined
              }
            >
              <Link to={category.href} className={styles.card}>
                <img
                  src={category.imageSrc}
                  alt={category.imageAlt}
                  className={styles.image}
                  loading="lazy"
                  decoding="async"
                />
                <span className={styles.shade} aria-hidden="true" />
                <span className={styles.meta}>
                  <span className={styles.name}>{category.name}</span>
                  <span className={styles.cta}>مشاهده</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
