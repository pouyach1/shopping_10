import { PRODUCT_STATUS_LABELS } from '../../utils/productForm';
import type { ProductStatus } from '../../types/product';

import styles from './AdminStatusBadge.module.css';

interface AdminStatusBadgeProps {
  status: ProductStatus;
}

export function AdminStatusBadge({ status }: AdminStatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {PRODUCT_STATUS_LABELS[status]}
    </span>
  );
}
