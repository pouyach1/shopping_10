import styles from './Search.module.css';

export function Search() {
  return (
    <main className={styles.page} dir="rtl">

      <div className={styles.container}>

        <h1>
          جستجو
        </h1>

        <p>
          محصولات جستجو شده اینجا نمایش داده می‌شوند.
        </p>

      </div>

    </main>
  );
}
