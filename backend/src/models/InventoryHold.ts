import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

/**
 * Durable hold bridging stock decrement and order commit.
 * Survives process crash between decrement and Order.create.
 */
export const INVENTORY_HOLD_STATUSES = [
  'open',
  'decremented',
  'committed',
  'released',
] as const;
export type InventoryHoldStatus = (typeof INVENTORY_HOLD_STATUSES)[number];

export interface InventoryHoldItem {
  productId: Types.ObjectId;
  quantity: number;
}

export interface InventoryHoldAttrs {
  storeId: Types.ObjectId;
  user: Types.ObjectId;
  status: InventoryHoldStatus;
  items: InventoryHoldItem[];
  order?: Types.ObjectId;
  orderNumber?: string;
  /** Set immediately before stock decrement — ages open holds for recovery. */
  decrementAttemptedAt?: Date;
  /** After this time, a decremented-but-uncommitted hold is recoverable. */
  recoverAfter: Date;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<InventoryHoldItem>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const schema = new Schema<InventoryHoldAttrs>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: INVENTORY_HOLD_STATUSES,
      required: true,
      default: 'open',
      index: true,
    },
    items: { type: [itemSchema], required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    orderNumber: { type: String, maxlength: 40, index: true },
    decrementAttemptedAt: { type: Date },
    recoverAfter: { type: Date, required: true, index: true },
    releasedAt: { type: Date },
  },
  { timestamps: true },
);

schema.index({ storeId: 1, 'items.productId': 1, status: 1 });
schema.index({ storeId: 1, order: 1 });
schema.index({ storeId: 1, status: 1, recoverAfter: 1 });

export type InventoryHoldDocument = HydratedDocument<InventoryHoldAttrs>;

export const InventoryHold = model<InventoryHoldAttrs>(
  'InventoryHold',
  schema,
);

/** Crash-window grace before orphan recovery may restock. */
export const INVENTORY_HOLD_RECOVER_MS = 60_000;
