import styles from './ComingSoon.module.css';

interface ComingSoonProps {
  title: string;
}

export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span className={styles.eyebrow}>LUXORA ADMIN</span>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>
          این بخش در مرحله بعدی فعال می‌شود.
        </p>
      </div>
    </div>
  );
}
