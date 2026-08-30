import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface CartItemAttrs {
  product: Types.ObjectId;
  quantity: number;
  size: string;
  color: string;
  colorValue?: string;
  unitPriceSnapshot: number;
  addedAt: Date;
  updatedAt: Date;
}

export interface CartAttrs {
  storeId: Types.ObjectId;
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
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

// One cart per user per store.
cartSchema.index({ storeId: 1, user: 1 }, { unique: true });
cartSchema.index({ storeId: 1, 'items.product': 1 });

export type CartDocument = HydratedDocument<CartAttrs>;
export type CartItemDocument = HydratedDocument<CartItemAttrs>;

export const Cart = model<CartAttrs>('Cart', cartSchema);
