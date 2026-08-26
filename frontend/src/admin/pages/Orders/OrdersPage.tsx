import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  Clock3,
  Eye,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';

import { formatPrice } from '../../../lib/formatCurrency';
import { AdminStatusBadge } from '../../components/AdminStatusBadge';
import { useAdminStore } from '../../hooks/useAdminStore';
import type { OrderStatus, PaymentStatus } from '../../types';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatOrderDateShort,
  getOrderListStats,
  isDateInRange,
  matchesOrderSearch,
} from '../../utils/orderLabels';

import styles from './OrdersPage.module.css';

type OrderStatusFilter = 'all' | OrderStatus;
type PaymentStatusFilter = 'all' | PaymentStatus;

export function OrdersPage() {
  const { data, getCustomer, getSettings } = useAdminStore();
  const settings = getSettings();

  const [query, setQuery] = useState('');
  const [orderStatus, setOrderStatus] = useState<OrderStatusFilter>('all');
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const stats = useMemo(() => getOrderListStats(data.orders), [data.orders]);

  const filtersActive =
    query.trim() !== '' ||
    orderStatus !== 'all' ||
    paymentStatus !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  const clearFilters = () => {
    setQuery('');
    setOrderStatus('all');
    setPaymentStatus('all');
    setDateFrom('');
    setDateTo('');
  };

  const filteredOrders = useMemo(() => {
    return [...data.orders]
      .filter((order) => {
        if (orderStatus !== 'all' && order.orderStatus !== orderStatus) {
          return false;
        }
        if (paymentStatus !== 'all' && order.paymentStatus !== paymentStatus) {
          return false;
        }
        if (!isDateInRange(order.createdAt, dateFrom || undefined, dateTo || undefined)) {
          return false;
        }
        const customer = getCustomer(order.customerId);
        return matchesOrderSearch(query, order, customer);
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [
    data.orders,
    query,
    orderStatus,
    paymentStatus,
    dateFrom,
    dateTo,
    getCustomer,
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>سفارش‌ها</h2>
          <p className={styles.subtitle}>
            مدیریت، پیگیری و چاپ سفارش‌های فروشگاه
          </p>
        </div>
      </header>

      <section className={styles.stats} aria-label="خلاصه سفارش‌ها">
        <article className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">
            <ShoppingBag size={16} />
          </span>
          <div>
            <p className={styles.statLabel}>کل سفارش‌ها</p>
            <p className={styles.statValue}>{formatPrice(stats.totalOrders)}</p>
          </div>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">
            <Clock3 size={16} />
          </span>
          <div>
            <p className={styles.statLabel}>در صف / باز</p>
            <p className={styles.statValue}>
              {formatPrice(stats.pendingOrders)}
            </p>
          </div>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">
            <ShoppingBag size={16} />
          </span>
          <div>
            <p className={styles.statLabel}>سفارش‌های امروز</p>
            <p className={styles.statValue}>{formatPrice(stats.todayOrders)}</p>
          </div>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">
            <Banknote size={16} />
          </span>
          <div>
            <p className={styles.statLabel}>فروش امروز</p>
            <p className={styles.statValue}>
              {formatPrice(stats.todayRevenue)}
              <small>{settings.currency}</small>
            </p>
          </div>
        </article>
      </section>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <span className={styles.srOnly}>جستجوی سفارش</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="شماره سفارش، نام مشتری یا موبایل..."
          />
        </label>

        <select
          className={styles.select}
          value={orderStatus}
          onChange={(event) =>
            setOrderStatus(event.target.value as OrderStatusFilter)
          }
          aria-label="فیلتر وضعیت سفارش"
        >
          <option value="all">همه وضعیت‌ها</option>
          {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={paymentStatus}
          onChange={(event) =>
            setPaymentStatus(event.target.value as PaymentStatusFilter)
          }
          aria-label="فیلتر وضعیت پرداخت"
        >
          <option value="all">همه پرداخت‌ها</option>
          {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map(
            (status) => (
              <option key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]}
              </option>
            ),
          )}
        </select>

        <label className={styles.dateField}>
          <span>از تاریخ</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </label>

        <label className={styles.dateField}>
          <span>تا تاریخ</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </label>

        {filtersActive ? (
          <button
            type="button"
            className={styles.clearButton}
            onClick={clearFilters}
          >
            <X size={14} />
            پاک کردن فیلترها
          </button>
        ) : null}
      </div>

      <p className={styles.resultCount}>
        {filteredOrders.length > 0
          ? `${formatPrice(filteredOrders.length)} سفارش`
          : null}
      </p>

      {filteredOrders.length === 0 ? (
        <div className={styles.empty}>
          <h3>
            {data.orders.length === 0
              ? 'سفارشی برای نمایش وجود ندارد.'
              : 'سفارشی با این مشخصات پیدا نشد.'}
          </h3>
          <p>
            {data.orders.length === 0
              ? 'وقتی مشتری سفارش ثبت کند، اینجا نمایش داده می‌شود.'
              : 'عبارت جستجو یا فیلترها را تغییر دهید.'}
          </p>
          {filtersActive ? (
            <button
              type="button"
              className={styles.clearButton}
              onClick={clearFilters}
            >
              پاک کردن فیلترها
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>شماره سفارش</th>
                  <th>مشتری</th>
                  <th>تاریخ</th>
                  <th>مبلغ</th>
                  <th>پرداخت</th>
                  <th>وضعیت سفارش</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const customer = getCustomer(order.customerId);
                  return (
                    <tr key={order.id}>
                      <td>
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className={styles.orderLink}
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td>
                        <div className={styles.customerCell}>
                          <strong>{customer?.name || '—'}</strong>
                          <span dir="ltr">{customer?.phone || '—'}</span>
                        </div>
                      </td>
                      <td>{formatOrderDateShort(order.createdAt)}</td>
                      <td>
                        <strong>
                          {formatPrice(order.total)} {settings.currency}
                        </strong>
                      </td>
                      <td>
                        <AdminStatusBadge
                          kind="payment"
                          status={order.paymentStatus}
                        />
                      </td>
                      <td>
                        <AdminStatusBadge
                          kind="order"
                          status={order.orderStatus}
                        />
                      </td>
                      <td>
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className={styles.actionLink}
                        >
                          <Eye size={14} />
                          مشاهده
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.cards} aria-label="فهرست موبایل سفارش‌ها">
            {filteredOrders.map((order) => {
              const customer = getCustomer(order.customerId);
              return (
                <article key={order.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className={styles.orderLink}
                    >
                      #{order.orderNumber}
                    </Link>
                    <AdminStatusBadge
                      kind="order"
                      status={order.orderStatus}
                    />
                  </div>
                  <p className={styles.cardCustomer}>
                    {customer?.name || '—'}
                    <span dir="ltr">{customer?.phone}</span>
                  </p>
                  <div className={styles.cardMeta}>
                    <span>{formatOrderDateShort(order.createdAt)}</span>
                    <strong>
                      {formatPrice(order.total)} {settings.currency}
                    </strong>
                  </div>
                  <div className={styles.cardFooter}>
                    <AdminStatusBadge
                      kind="payment"
                      status={order.paymentStatus}
                    />
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className={styles.actionLink}
                    >
                      <Eye size={14} />
                      مشاهده
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
