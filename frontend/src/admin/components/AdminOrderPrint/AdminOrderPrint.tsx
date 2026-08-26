import { formatPrice } from '../../../lib/formatCurrency';
import type { AdminCustomer } from '../../types/customer';
import type { AdminOrder } from '../../types/order';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatOrderDate,
  getOrderDiscount,
  getOrderItemLineTotal,
  getPaymentMethodLabel,
} from '../../utils/orderLabels';

import styles from './AdminOrderPrint.module.css';

export interface AdminOrderPrintProps {
  order: AdminOrder;
  customer?: AdminCustomer;
  shippingMethodName?: string;
  currency?: string;
}

/**
 * Printer-friendly order document.
 * Hidden on screen; shown exclusively under @media print.
 * Always uses light/printer colors — independent of admin theme.
 */
export function AdminOrderPrint({
  order,
  customer,
  shippingMethodName,
  currency = 'تومان',
}: AdminOrderPrintProps) {
  const discount = getOrderDiscount(order);

  return (
    <article
      className={styles.document}
      data-admin-print-root=""
      aria-hidden="true"
    >
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>LUXORA</p>
          <h1 className={styles.title}>سفارش فروشگاه</h1>
        </div>
        <div className={styles.meta}>
          <p>
            <span>شماره سفارش:</span>
            <strong>#{order.orderNumber}</strong>
          </p>
          <p>
            <span>تاریخ:</span>
            <strong>{formatOrderDate(order.createdAt)}</strong>
          </p>
        </div>
      </header>

      <hr className={styles.rule} />

      <section className={styles.section}>
        <h2>اطلاعات مشتری</h2>
        <dl className={styles.dl}>
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
          <div>
            <dt>آدرس</dt>
            <dd>{order.shippingAddress}</dd>
          </div>
        </dl>
      </section>

      <hr className={styles.rule} />

      <section className={styles.section}>
        <h2>اقلام سفارش</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>محصول</th>
              <th>سایز</th>
              <th>رنگ</th>
              <th>تعداد</th>
              <th>قیمت</th>
              <th>جمع</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={`${item.productId}-${index}`}>
                <td>{item.name}</td>
                <td>{item.size || '—'}</td>
                <td>{item.color || '—'}</td>
                <td>{formatPrice(item.quantity)}</td>
                <td>
                  {formatPrice(item.unitPrice)} {currency}
                </td>
                <td>
                  {formatPrice(
                    getOrderItemLineTotal(item.unitPrice, item.quantity),
                  )}{' '}
                  {currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <hr className={styles.rule} />

      <section className={styles.totals}>
        <div>
          <span>جمع کالاها</span>
          <strong>
            {formatPrice(order.subtotal)} {currency}
          </strong>
        </div>
        <div>
          <span>تخفیف</span>
          <strong>
            {discount > 0 ? `${formatPrice(discount)} ${currency}` : '—'}
          </strong>
        </div>
        <div>
          <span>هزینه ارسال</span>
          <strong>
            {formatPrice(order.shippingCost)} {currency}
          </strong>
        </div>
        <div className={styles.grandTotal}>
          <span>مبلغ نهایی</span>
          <strong>
            {formatPrice(order.total)} {currency}
          </strong>
        </div>
      </section>

      <hr className={styles.rule} />

      <section className={styles.section}>
        <dl className={styles.dl}>
          <div>
            <dt>روش پرداخت</dt>
            <dd>{getPaymentMethodLabel(order.paymentMethod)}</dd>
          </div>
          <div>
            <dt>وضعیت پرداخت</dt>
            <dd>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</dd>
          </div>
          <div>
            <dt>روش ارسال</dt>
            <dd>{shippingMethodName || order.shippingMethod}</dd>
          </div>
          <div>
            <dt>وضعیت سفارش</dt>
            <dd>{ORDER_STATUS_LABELS[order.orderStatus]}</dd>
          </div>
          {order.trackingCode ? (
            <div>
              <dt>کد پیگیری</dt>
              <dd dir="ltr">{order.trackingCode}</dd>
            </div>
          ) : null}
          {order.note ? (
            <div>
              <dt>یادداشت</dt>
              <dd>{order.note}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <footer className={styles.footer}>
        <p>با تشکر از خرید شما</p>
        <p className={styles.footerBrand}>LUXORA</p>
      </footer>
    </article>
  );
}
