import {
  Banknote,
  Clock3,
  Package,
  ShoppingBag,
} from 'lucide-react';

import { formatPrice } from '../../../lib/formatCurrency';
import { useAdminStore } from '../../hooks/useAdminStore';
import type { OrderStatus } from '../../types/order';

import styles from './Dashboard.module.css';

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'در انتظار',
  confirmed: 'تأیید شده',
  processing: 'در حال آماده‌سازی',
  shipped: 'ارسال شده',
  delivered: 'تحویل شده',
  cancelled: 'لغو شده',
};

export function Dashboard() {
  const {
    getDashboardStats,
    getRecentOrders,
    getLowStockProducts,
    getBestSellingProducts,
    getSalesTrend,
    getCustomer,
    getSettings,
  } = useAdminStore();

  const stats = getDashboardStats();
  const recentOrders = getRecentOrders(6);
  const lowStock = getLowStockProducts(5);
  const bestSellers = getBestSellingProducts(5);
  const trend = getSalesTrend(7);
  const settings = getSettings();
  const maxRevenue = Math.max(...trend.map((point) => point.revenue), 1);

  const kpiCards = [
    {
      id: 'sales',
      label: 'فروش امروز',
      value: formatPrice(stats.todaySales),
      unit: settings.currency,
      icon: Banknote,
    },
    {
      id: 'orders',
      label: 'سفارش‌ها',
      value: formatPrice(stats.totalOrders),
      unit: `امروز ${formatPrice(stats.todayOrders)}`,
      icon: ShoppingBag,
    },
    {
      id: 'pending',
      label: 'سفارش‌های باز',
      value: formatPrice(stats.pendingOrders),
      unit: 'در صف',
      icon: Clock3,
    },
    {
      id: 'products',
      label: 'محصولات',
      value: formatPrice(stats.productCount),
      unit: `${formatPrice(stats.customerCount)} مشتری`,
      icon: Package,
    },
  ] as const;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>داشبورد</h2>
          <p className={styles.subtitle}>نمای کلی فروشگاه</p>
        </div>
        <span className={styles.badge}>متصل به داده‌های آزمایشی</span>
      </header>

      <section className={styles.kpiGrid} aria-label="شاخص‌های کلیدی">
        {kpiCards.map((card) => {
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
          <h3 className={styles.chartTitle}>گزارش فروش ۷ روز اخیر</h3>
        </div>
        <div className={styles.trendBody}>
          <div className={styles.trendBars} role="img" aria-label="نمودار فروش هفتگی">
            {trend.map((point) => {
              const height = Math.max(8, Math.round((point.revenue / maxRevenue) * 100));
              const label = point.date.slice(5);

              return (
                <div key={point.date} className={styles.trendItem}>
                  <div className={styles.trendBarTrack}>
                    <div
                      className={styles.trendBar}
                      style={{ height: `${height}%` }}
                      title={`${formatPrice(point.revenue)} ${settings.currency}`}
                    />
                  </div>
                  <span className={styles.trendLabel}>{label}</span>
                  <span className={styles.trendMeta}>
                    {formatPrice(point.orders)} سفارش
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className={styles.panels}>
        <section className={styles.panel} aria-label="سفارش‌های اخیر">
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>سفارش‌های اخیر</h3>
            <span className={styles.panelHint}>
              {formatPrice(stats.lowStockCount)} محصول کم‌موجودی
            </span>
          </div>
          <ul className={styles.list}>
            {recentOrders.map((order) => {
              const customer = getCustomer(order.customerId);

              return (
                <li key={order.id} className={styles.listRow}>
                  <div>
                    <strong>{order.orderNumber}</strong>
                    <span>{customer?.name ?? 'مشتری'}</span>
                  </div>
                  <div className={styles.listMeta}>
                    <span>{formatPrice(order.total)} {settings.currency}</span>
                    <em>{ORDER_STATUS_LABELS[order.orderStatus]}</em>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={styles.panel} aria-label="کم‌موجودی">
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>کم‌موجودی</h3>
          </div>
          {lowStock.length === 0 ? (
            <p className={styles.empty}>محصول کم‌موجودی وجود ندارد.</p>
          ) : (
            <ul className={styles.list}>
              {lowStock.map((product) => (
                <li key={product.id} className={styles.listRow}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>آستانه: {formatPrice(product.lowStockThreshold)}</span>
                  </div>
                  <div className={styles.listMeta}>
                    <em>{formatPrice(product.stock)} عدد</em>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel} aria-label="پرفروش‌ها">
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>پرفروش‌ترین‌ها</h3>
          </div>
          {bestSellers.length === 0 ? (
            <p className={styles.empty}>هنوز فروشی ثبت نشده است.</p>
          ) : (
            <ul className={styles.list}>
              {bestSellers.map((entry) => (
                <li key={entry.product.id} className={styles.listRow}>
                  <div>
                    <strong>{entry.product.name}</strong>
                    <span>
                      {formatPrice(entry.revenue)} {settings.currency}
                    </span>
                  </div>
                  <div className={styles.listMeta}>
                    <em>{formatPrice(entry.quantitySold)} فروش</em>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
