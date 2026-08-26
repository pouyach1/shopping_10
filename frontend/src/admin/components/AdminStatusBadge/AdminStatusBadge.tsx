import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../../utils/orderLabels';
import { PRODUCT_STATUS_LABELS } from '../../utils/productForm';
import type { OrderStatus, PaymentStatus } from '../../types/order';
import type { ProductStatus } from '../../types/product';

import styles from './AdminStatusBadge.module.css';

type ProductBadgeProps = {
  kind?: 'product';
  status: ProductStatus;
};

type OrderBadgeProps = {
  kind: 'order';
  status: OrderStatus;
};

type PaymentBadgeProps = {
  kind: 'payment';
  status: PaymentStatus;
};

export type AdminStatusBadgeProps =
  | ProductBadgeProps
  | OrderBadgeProps
  | PaymentBadgeProps;

export function AdminStatusBadge(props: AdminStatusBadgeProps) {
  if (props.kind === 'order') {
    return (
      <span
        className={`${styles.badge} ${styles[`order_${props.status}`]}`}
        data-status={props.status}
      >
        {ORDER_STATUS_LABELS[props.status]}
      </span>
    );
  }

  if (props.kind === 'payment') {
    return (
      <span
        className={`${styles.badge} ${styles[`payment_${props.status}`]}`}
        data-status={props.status}
      >
        {PAYMENT_STATUS_LABELS[props.status]}
      </span>
    );
  }

  return (
    <span className={`${styles.badge} ${styles[props.status]}`}>
      {PRODUCT_STATUS_LABELS[props.status]}
    </span>
  );
}
