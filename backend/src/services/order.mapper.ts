import type {
  OrderAddressSnapshot,
  OrderAttrs,
  OrderDocument,
  OrderHistoryEntry,
  OrderItemSnapshot,
} from '../models/Order';
import type { OrderStatus, PaymentStatus, FulfillmentStatus } from '../config/constants';

export interface PublicOrderItem {
  productId: string;
  sku: string;
  name: string;
  slug: string;
  imageSrc: string;
  productKind: string;
  size: string;
  color: string;
  colorValue?: string;
  quantity: number;
  unitPrice: number;
  unitSalePrice?: number;
  unitFinalPrice: number;
  lineSubtotal: number;
  lineDiscount: number;
  lineTotal: number;
  currency: string;
  href: string;
}

export interface PublicOrderAddress {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode?: string;
  landline?: string;
  notes?: string;
}

export interface PublicOrderHistory {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorType: 'customer' | 'admin' | 'system';
  actorId?: string;
  reason?: string;
  at: string;
}

export interface PublicOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  items: PublicOrderItem[];
  shippingAddress: PublicOrderAddress;
  shippingMethodId: string;
  shippingMethodTitle: string;
  paymentMethod: string;
  currency: string;
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  total: number;
  history: PublicOrderHistory[];
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  paidAt?: string;
}

function mapItem(item: OrderItemSnapshot): PublicOrderItem {
  return {
    productId: String(item.productId),
    sku: item.sku,
    name: item.name,
    slug: item.slug,
    imageSrc: item.imageSrc,
    productKind: item.productKind,
    size: item.size,
    color: item.color,
    colorValue: item.colorValue,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitSalePrice: item.unitSalePrice,
    unitFinalPrice: item.unitFinalPrice,
    lineSubtotal: item.lineSubtotal,
    lineDiscount: item.lineDiscount,
    lineTotal: item.lineTotal,
    currency: item.currency,
    href: `/product/${item.slug}`,
  };
}

function mapAddress(address: OrderAddressSnapshot): PublicOrderAddress {
  return {
    recipientName: address.recipientName,
    phone: address.phone,
    province: address.province,
    city: address.city,
    addressLine: address.addressLine,
    postalCode: address.postalCode,
    landline: address.landline,
    notes: address.notes,
  };
}

function mapHistory(entry: OrderHistoryEntry): PublicOrderHistory {
  return {
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    actorType: entry.actorType,
    actorId: entry.actorId,
    reason: entry.reason,
    at: entry.at.toISOString(),
  };
}

export function toPublicOrder(order: OrderDocument | OrderAttrs & { _id: { toString(): string } }): PublicOrder {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    items: order.items.map(mapItem),
    shippingAddress: mapAddress(order.shippingAddress),
    shippingMethodId: order.shippingMethodId,
    shippingMethodTitle: order.shippingMethodTitle,
    paymentMethod: order.paymentMethod,
    currency: order.currency,
    itemCount: order.itemCount,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingCost: order.shippingCost,
    total: order.total,
    history: (order.history ?? []).map(mapHistory),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    cancelledAt: order.cancelledAt?.toISOString(),
    paidAt: order.paidAt?.toISOString(),
  };
}
