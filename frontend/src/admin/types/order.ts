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
  orderNumber: string;

  customerId: string;

  items: AdminOrderItem[];

  subtotal: number;
  shippingCost: number;
  total: number;

  shippingMethod: string;
  paymentMethod: string;

  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;

  shippingAddress: string;

  note?: string;

  createdAt: string;
  updatedAt: string;
}
