import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Package } from 'lucide-react';

import { useProfileAuth } from '../../hooks/useProfileAuth';
import { formatPrice } from '../../lib/formatCurrency';
import {
  CUSTOMER_ORDER_STATUS_LABELS,
  formatCustomerOrderDate,
  getCustomerOrders,
  toPersianItemCount,
  type CustomerOrderSummary,
} from '../../services/customerOrders';

import { ProfileSection } from './ProfileSection';

import styles from './ProfileAccountHub.module.css';

function OrderCard({
  order,
  expanded,
  onToggle,
}: {
  order: CustomerOrderSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <li className={styles.orderCard}>
      <div className={styles.orderTop}>
        <div className={styles.orderIdentity}>
          <span className={styles.orderNumber} dir="ltr">
            #{order.orderNumber}
          </span>
          <span className={styles.orderDate}>
            {formatCustomerOrderDate(order.createdAt)}
          </span>
        </div>
        <span
          className={`${styles.orderStatus} ${styles[`status_${order.status}`]}`}
        >
          {CUSTOMER_ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className={styles.orderBody}>
        <p className={styles.orderItems}>
          محصولات: {toPersianItemCount(order.itemCount)} مورد
        </p>
        <p className={styles.orderTotal}>{formatPrice(order.total)} تومان</p>
      </div>

      <button
        type="button"
        className={styles.orderAction}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {expanded ? 'بستن جزئیات' : 'مشاهده سفارش'}
        <ChevronLeft size={16} strokeWidth={1.7} aria-hidden="true" />
      </button>

      {expanded ? (
        <div className={styles.orderDetail} role="region">
          <p>
            شماره سفارش: <span dir="ltr">{order.orderNumber}</span>
          </p>
          <p>وضعیت: {CUSTOMER_ORDER_STATUS_LABELS[order.status]}</p>
          <p>تعداد اقلام: {toPersianItemCount(order.itemCount)} مورد</p>
          <p>مبلغ کل: {formatPrice(order.total)} تومان</p>
          <p className={styles.orderDetailNote}>
            صفحه جزئیات سفارش پس از اتصال به سامانه سفارش‌ها فعال می‌شود.
          </p>
        </div>
      ) : null}
    </li>
  );
}

export function ProfileOrders() {
  const { customer } = useProfileAuth();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  if (!customer) return null;

  const orders = getCustomerOrders(customer.id);

  return (
    <ProfileSection lead="پیگیری وضعیت و جزئیات سفارش‌های اخیر">
      {orders.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Package size={22} strokeWidth={1.5} />
          </span>
          <h2>هنوز سفارشی ثبت نکرده‌اید</h2>
          <p>اولین انتخابتان را از مجموعه لوکسورا پیدا کنید.</p>
          <Link to="/shop" className={styles.primaryButton}>
            مشاهده فروشگاه
          </Link>
        </div>
      ) : (
        <ul className={styles.orderList}>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expandedOrderId === order.id}
              onToggle={() =>
                setExpandedOrderId((current) =>
                  current === order.id ? null : order.id,
                )
              }
            />
          ))}
        </ul>
      )}
    </ProfileSection>
  );
}
