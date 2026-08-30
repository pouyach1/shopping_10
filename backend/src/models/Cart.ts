import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface CartItemAttrs {
  product: Types.ObjectId;
  quantity: number;
  /** Variant attributes — match storefront line identity. */
  size: string;
  color: string;
  colorValue?: string;
  /** Display unit price when the line was last written (price-change detection). */
  unitPriceSnapshot: number;
  addedAt: Date;
  updatedAt: Date;
}

export interface CartAttrs {
  user: Types.ObjectId;
  items: CartItemAttrs[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<CartItemAttrs>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    size: { type: String, trim: true, maxlength: 40, default: '' },
    color: { type: String, trim: true, maxlength: 80, default: '' },
    colorValue: { type: String, trim: true, maxlength: 20 },
    unitPriceSnapshot: { type: Number, required: true, min: 0 },
    addedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const cartSchema = new Schema<CartAttrs>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

cartSchema.index({ 'items.product': 1 });

export type CartDocument = HydratedDocument<CartAttrs>;
export type CartItemDocument = HydratedDocument<CartItemAttrs>;

export const Cart = model<CartAttrs>('Cart', cartSchema);
