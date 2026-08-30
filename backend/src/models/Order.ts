import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import {
  DEFAULT_CURRENCY,
  FINANCIAL_INTEGRITY_STATUSES,
  FULFILLMENT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type FinancialIntegrityStatus,
  type FulfillmentStatus,
  type OrderStatus,
  type PaymentMethodId,
  type PaymentStatus,
  type ShippingMethodId,
} from '../config/constants';

export interface OrderItemSnapshot {
  productId: Types.ObjectId;
  sku: string;
  name: string;
  slug: string;
  imageSrc: string;
  productKind: string;
  size: string;
  color: string;
  colorValue?: string;
  quantity: number;
  /** Regular list price at purchase. */
  unitPrice: number;
  /** Sale/display unit price charged. */
  unitSalePrice?: number;
  /** What the customer paid per unit (integer تومان). */
  unitFinalPrice: number;
  lineSubtotal: number;
  lineDiscount: number;
  lineTotal: number;
  currency: string;
}

export interface OrderAddressSnapshot {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode?: string;
  landline?: string;
  notes?: string;
}

export interface OrderHistoryEntry {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorType: 'customer' | 'admin' | 'system';
  actorId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  at: Date;
}

export interface OrderAttrs {
  storeId: Types.ObjectId;
  orderNumber: string;
  user: Types.ObjectId;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  items: OrderItemSnapshot[];
  shippingAddress: OrderAddressSnapshot;
  shippingMethodId: ShippingMethodId;
  shippingMethodTitle: string;
  paymentMethod: PaymentMethodId;
  currency: string;
  itemCount: number;
  subtotal: number;
  /** Product sale markdowns (not coupon). */
  discountTotal: number;
  /** Server-calculated coupon discount. */
  couponDiscount: number;
  couponCode?: string;
  couponId?: Types.ObjectId;
  shippingCost: number;
  total: number;
  refundedTotal: number;
  history: OrderHistoryEntry[];
  idempotencyKey?: string;
  inventoryDecremented: boolean;
  /**
   * Set atomically when inventory restoration is claimed.
   * Prevents double-restock across cancel × expiry races.
   */
  inventoryReleaseClaimedAt?: Date | null;
  inventoryHoldId?: Types.ObjectId;
  /** Soft reservation expiry for unpaid / COD checkout stock. */
  inventoryReservedUntil?: Date;
  /**
   * When money and order state diverge (e.g. late pay after cancel).
   * Never implies funds were returned unless provider confirmed.
   */
  financialIntegrityStatus: FinancialIntegrityStatus;
  cancelledAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItemSnapshot>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    sku: { type: String, required: true, maxlength: 64 },
    name: { type: String, required: true, maxlength: 200 },
    slug: { type: String, required: true, maxlength: 160 },
    imageSrc: { type: String, default: '', maxlength: 1000 },
    productKind: { type: String, required: true, maxlength: 40 },
    size: { type: String, default: '', maxlength: 40 },
    color: { type: String, default: '', maxlength: 80 },
    colorValue: { type: String, maxlength: 20 },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitSalePrice: { type: Number, min: 0 },
    unitFinalPrice: { type: Number, required: true, min: 0 },
    lineSubtotal: { type: Number, required: true, min: 0 },
    lineDiscount: { type: Number, required: true, min: 0, default: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: DEFAULT_CURRENCY },
  },
  { _id: false },
);

const addressSchema = new Schema<OrderAddressSnapshot>(
  {
    recipientName: { type: String, required: true, maxlength: 120 },
    phone: { type: String, required: true, maxlength: 20 },
    province: { type: String, required: true, maxlength: 80 },
    city: { type: String, required: true, maxlength: 80 },
    addressLine: { type: String, required: true, maxlength: 400 },
    postalCode: { type: String, maxlength: 20 },
    landline: { type: String, maxlength: 20 },
    notes: { type: String, maxlength: 500 },
  },
  { _id: false },
);

const historySchema = new Schema<OrderHistoryEntry>(
  {
    fromStatus: { type: String, enum: [...ORDER_STATUSES, null], default: null },
    toStatus: { type: String, enum: ORDER_STATUSES, required: true },
    actorType: {
      type: String,
      enum: ['customer', 'admin', 'system'],
      required: true,
    },
    actorId: { type: String },
    reason: { type: String, maxlength: 400 },
    metadata: { type: Schema.Types.Mixed },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderAttrs>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      maxlength: 40,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
      default: 'awaiting_payment',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
      default: 'unpaid',
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: FULFILLMENT_STATUSES,
      required: true,
      default: 'unfulfilled',
    },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: addressSchema, required: true },
    shippingMethodId: { type: String, required: true },
    shippingMethodTitle: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    currency: { type: String, required: true, default: DEFAULT_CURRENCY },
    itemCount: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, required: true, min: 0, default: 0 },
    couponDiscount: { type: Number, required: true, min: 0, default: 0 },
    couponCode: { type: String, maxlength: 40, index: true, sparse: true },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    shippingCost: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    refundedTotal: { type: Number, default: 0, min: 0 },
    history: { type: [historySchema], default: [] },
    idempotencyKey: { type: String, index: true, sparse: true },
    inventoryDecremented: { type: Boolean, default: false },
    inventoryReleaseClaimedAt: { type: Date, default: null, index: true },
    inventoryHoldId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryHold',
      index: true,
      sparse: true,
    },
    inventoryReservedUntil: { type: Date, index: true },
    financialIntegrityStatus: {
      type: String,
      enum: FINANCIAL_INTEGRITY_STATUSES,
      default: 'ok',
      index: true,
    },
    cancelledAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

orderSchema.index({ storeId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ storeId: 1, user: 1, createdAt: -1 });
orderSchema.index(
  { storeId: 1, user: 1, idempotencyKey: 1 },
  { unique: true, sparse: true },
);
orderSchema.index({ storeId: 1, status: 1, createdAt: -1 });
/** Unfiltered admin order list sorts by createdAt */
orderSchema.index({ storeId: 1, createdAt: -1 });
orderSchema.index({
  storeId: 1,
  status: 1,
  paymentStatus: 1,
  inventoryReservedUntil: 1,
});

export type OrderDocument = HydratedDocument<OrderAttrs>;

export const Order = model<OrderAttrs>('Order', orderSchema);
