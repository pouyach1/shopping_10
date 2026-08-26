import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Package,
  Printer,
  Truck,
} from 'lucide-react';

import { formatPrice } from '../../../lib/formatCurrency';
import { AdminOrderPrint } from '../../components/AdminOrderPrint';
import { AdminStatusBadge } from '../../components/AdminStatusBadge';
import { useAdminStore } from '../../hooks/useAdminStore';
import { notifyOrderStatusChange } from '../../services/orderNotifications';
import type { OrderStatus, PaymentStatus } from '../../types';
import {
  ORDER_STATUS_LABELS,
  ORDER_TIMELINE_LABELS,
  ORDER_TIMELINE_STEPS,
  PAYMENT_STATUS_LABELS,
  formatOrderDate,
  getOrderDiscount,
  getOrderItemLineTotal,
  getPaymentMethodLabel,
} from '../../utils/orderLabels';

import styles from './OrderDetailPage.module.css';

export function OrderDetailPage() {
  const { id } = useParams();
  const {
    getOrder,
    getCustomer,
    getSettings,
    updateOrderStatus,
    updatePaymentStatus,
  } = useAdminStore();

  const order = id ? getOrder(id) : undefined;
  const customer = order ? getCustomer(order.customerId) : undefined;
  const settings = getSettings();
  const [toast, setToast] = useState<string | null>(null);

  const shippingMethodName = useMemo(() => {
    if (!order) return undefined;
    return (
      settings.shippingMethods.find(
        (method) => method.id === order.shippingMethod,
      )?.name ?? order.shippingMethod
    );
  }, [order, settings.shippingMethods]);

  const discount = order ? getOrderDiscount(order) : 0;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  if (!order) {
    return (
      <div className={styles.missing}>
        <h2>سفارش پیدا نشد</h2>
        <p>این سفارش وجود ندارد یا حذف شده است.</p>
        <Link to="/admin/orders" className={styles.secondaryButton}>
          بازگشت به سفارش‌ها
        </Link>
      </div>
    );
  }

  const handleStatusChange = (next: OrderStatus) => {
    const updated = updateOrderStatus(order.id, next);
    if (!updated) return;
    notifyOrderStatusChange(updated, customer);
    showToast('وضعیت سفارش به‌روزرسانی شد.');
  };

  const handlePaymentChange = (next: PaymentStatus) => {
    const updated = updatePaymentStatus(order.id, next);
    if (!updated) return;
    showToast('وضعیت پرداخت به‌روزرسانی شد.');
  };

  const handlePrint = () => {
    window.print();
  };

  const timelineIndex =
    order.orderStatus === 'cancelled'
      ? -1
      : ORDER_TIMELINE_STEPS.indexOf(
          order.orderStatus as (typeof ORDER_TIMELINE_STEPS)[number],
        );

  return (
    <div className={styles.page}>
      <div className={styles.screenUi}>
        <header className={styles.header}>
          <div>
            <Link to="/admin/orders" className={styles.backLink}>
              <ArrowRight size={16} strokeWidth={1.75} />
              بازگشت به سفارش‌ها
            </Link>
            <div className={styles.titleRow}>
              <h2 className={styles.title}>#{order.orderNumber}</h2>
              <AdminStatusBadge kind="order" status={order.orderStatus} />
              <AdminStatusBadge kind="payment" status={order.paymentStatus} />
            </div>
            <p className={styles.subtitle}>{formatOrderDate(order.createdAt)}</p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.printButton}
              onClick={handlePrint}
              aria-label="چاپ سفارش"
            >
              <Printer size={16} strokeWidth={1.75} />
              چاپ سفارش
            </button>
          </div>
        </header>

        <section className={styles.actionsBar} aria-label="اقدامات سفارش">
          <label className={styles.control}>
            <span>تغییر وضعیت</span>
            <select
              value={order.orderStatus}
              onChange={(event) =>
                handleStatusChange(event.target.value as OrderStatus)
              }
              aria-label="وضعیت سفارش"
            >
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map(
                (status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_LABELS[status]}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className={styles.control}>
            <span>وضعیت پرداخت</span>
            <select
              value={order.paymentStatus}
              onChange={(event) =>
                handlePaymentChange(event.target.value as PaymentStatus)
              }
              aria-label="وضعیت پرداخت"
            >
              {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map(
                (status) => (
                  <option key={status} value={status}>
                    {PAYMENT_STATUS_LABELS[status]}
                  </option>
                ),
              )}
            </select>
          </label>

          <button
            type="button"
            className={styles.printButtonSecondary}
            onClick={handlePrint}
            aria-label="چاپ سفارش"
          >
            <Printer size={15} />
            چاپ سفارش
          </button>
        </section>

        <section className={styles.timeline} aria-label="مسیر سفارش">
          {order.orderStatus === 'cancelled' ? (
            <p className={styles.cancelledNote}>
              این سفارش لغو شده است و از مسیر عادی خارج شده.
            </p>
          ) : (
            <ol className={styles.timelineList}>
              {ORDER_TIMELINE_STEPS.map((step, index) => {
                const done = index <= timelineIndex;
                const current = index === timelineIndex;
                return (
                  <li
                    key={step}
                    className={`${styles.timelineItem} ${
                      done ? styles.timelineDone : ''
                    } ${current ? styles.timelineCurrent : ''}`}
                  >
                    <span className={styles.timelineDot} aria-hidden="true" />
                    <span>{ORDER_TIMELINE_LABELS[step]}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <section className={styles.card}>
              <h3 className={styles.sectionTitle}>
                <Package size={16} />
                اقلام سفارش
              </h3>
              <ul className={styles.items}>
                {order.items.map((item, index) => (
                  <li key={`${item.productId}-${index}`} className={styles.item}>
                    <div className={styles.itemMedia}>
                      {item.imageSrc ? (
                        <img src={item.imageSrc} alt={item.name} />
                      ) : (
                        <span className={styles.itemFallback} aria-hidden="true">
                          <Package size={18} />
                        </span>
                      )}
                    </div>
                    <div className={styles.itemBody}>
                      <strong>{item.name}</strong>
                      <p>
                        {item.size ? `سایز: ${item.size}` : null}
                        {item.size && item.color ? ' · ' : null}
                        {item.color ? `رنگ: ${item.color}` : null}
                      </p>
                      <p>
                        {formatPrice(item.quantity)} ×{' '}
                        {formatPrice(item.unitPrice)} {settings.currency}
                      </p>
                    </div>
                    <div className={styles.itemTotal}>
                      {formatPrice(
                        getOrderItemLineTotal(item.unitPrice, item.quantity),
                      )}{' '}
                      {settings.currency}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.card}>
              <h3 className={styles.sectionTitle}>جمع‌ها</h3>
              <dl className={styles.totals}>
                <div>
                  <dt>جمع کالاها</dt>
                  <dd>
                    {formatPrice(order.subtotal)} {settings.currency}
                  </dd>
                </div>
                <div>
                  <dt>تخفیف</dt>
                  <dd>
                    {discount > 0
                      ? `${formatPrice(discount)} ${settings.currency}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>هزینه ارسال</dt>
                  <dd>
                    {formatPrice(order.shippingCost)} {settings.currency}
                  </dd>
                </div>
                <div className={styles.grandTotal}>
                  <dt>مبلغ نهایی</dt>
                  <dd>
                    {formatPrice(order.total)} {settings.currency}
                  </dd>
                </div>
              </dl>
              {order.note ? (
                <p className={styles.note}>
                  <strong>یادداشت:</strong> {order.note}
                </p>
              ) : null}
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.card}>
              <h3 className={styles.sectionTitle}>مشتری</h3>
              <dl className={styles.infoList}>
                <div>
                  <dt>نام</dt>
                  <dd>{customer?.name || '—'}</dd>
                </div>
                <div>
                  <dt>موبایل</dt>
                  <dd dir="ltr">{customer?.phone || '—'}</dd>
                </div>
                {customer?.email ? (
                  <div>
                    <dt>ایمیل</dt>
                    <dd dir="ltr">{customer.email}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className={styles.card}>
              <h3 className={styles.sectionTitle}>
                <Truck size={16} />
                ارسال
              </h3>
              <dl className={styles.infoList}>
                <div>
                  <dt>آدرس</dt>
                  <dd>{order.shippingAddress}</dd>
                </div>
                <div>
                  <dt>روش ارسال</dt>
                  <dd>{shippingMethodName}</dd>
                </div>
                <div>
                  <dt>هزینه ارسال</dt>
                  <dd>
                    {formatPrice(order.shippingCost)} {settings.currency}
                  </dd>
                </div>
                {order.trackingCode ? (
                  <div>
                    <dt>کد پیگیری</dt>
                    <dd dir="ltr">{order.trackingCode}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className={styles.card}>
              <h3 className={styles.sectionTitle}>پرداخت</h3>
              <dl className={styles.infoList}>
                <div>
                  <dt>روش پرداخت</dt>
                  <dd>{getPaymentMethodLabel(order.paymentMethod)}</dd>
                </div>
                <div>
                  <dt>وضعیت</dt>
                  <dd>
                    <AdminStatusBadge
                      kind="payment"
                      status={order.paymentStatus}
                    />
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>

        {toast ? (
          <div className={styles.toast} role="status">
            {toast}
          </div>
        ) : null}
      </div>

      <AdminOrderPrint
        order={order}
        customer={customer}
        shippingMethodName={shippingMethodName}
        currency={settings.currency}
      />
    </div>
  );
}
