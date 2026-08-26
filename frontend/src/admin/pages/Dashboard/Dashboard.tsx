import {
  Banknote,
  Package,
  ShoppingBag,
  Users,
} from 'lucide-react';

import styles from './Dashboard.module.css';

const KPI_CARDS = [
  {
    id: 'sales',
    label: 'فروش امروز',
    value: '۱۲٬۴۵۰٬۰۰۰',
    unit: 'تومان',
    icon: Banknote,
  },
  {
    id: 'orders',
    label: 'سفارش‌ها',
    value: '۱۸',
    unit: 'سفارش',
    icon: ShoppingBag,
  },
  {
    id: 'products',
    label: 'محصولات',
    value: '۶',
    unit: 'محصول',
    icon: Package,
  },
  {
    id: 'customers',
    label: 'مشتریان',
    value: '۴۲',
    unit: 'نفر',
    icon: Users,
  },
] as const;

export function Dashboard() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>داشبورد</h2>
          <p className={styles.subtitle}>نمای کلی فروشگاه</p>
        </div>
        <span className={styles.badge}>داده‌های موقت — فاز ۱</span>
      </header>

      <section className={styles.kpiGrid} aria-label="شاخص‌های کلیدی">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.id} className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{card.label}</span>
                <span className={styles.kpiIcon} aria-hidden="true">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
              </div>
              <p className={styles.kpiValue}>
                {card.value}
                <small>{card.unit}</small>
              </p>
            </article>
          );
        })}
      </section>

      <section className={styles.chartCard} aria-label="گزارش فروش">
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>گزارش فروش</h3>
        </div>
        <div className={styles.chartPlaceholder}>
          <p>
            داده‌های واقعی داشبورد در مرحله بعدی متصل می‌شوند.
          </p>
        </div>
      </section>
    </div>
  );
}
