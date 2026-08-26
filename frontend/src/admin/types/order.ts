export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'cod'
  | 'failed';

export interface AdminOrderItem {
  productId: string;
  name: string;
  imageSrc?: string;
  size?: string;
  color?: string;
  unitPrice: number;
  quantity: number;
}

export interface AdminOrder {
  id: string;
  /** Human-friendly number shown in admin/UI, e.g. LX-10421 */
  orderNumber: string;

  customerId: string;

  items: AdminOrderItem[];

  subtotal: number;
  /** Optional discount amount deducted before final total. */
  discount?: number;
  shippingCost: number;
  total: number;

  shippingMethod: string;
  paymentMethod: string;

  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;

  shippingAddress: string;

  /** Optional carrier tracking code for future SMS / fulfillment. */
  trackingCode?: string;

  note?: string;

  createdAt: string;
  updatedAt: string;
}
