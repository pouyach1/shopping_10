import styles from './Placeholder.module.css';

interface PlaceholderProps {
  aspectRatio?: string;
  label?: string;
  variant?: 'default' | 'image' | 'avatar';
}

export function Placeholder({ aspectRatio = '4/5', label = 'Image placeholder', variant = 'image' }: PlaceholderProps) {
  return (
    <div
      className={`${styles.placeholder} ${styles[variant]}`}
      style={{ aspectRatio }}
      role="img"
      aria-label={label}
    >
      <span className={styles.label}>{label}</span>
    </div>
  );
}
