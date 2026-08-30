import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface WishlistAttrs {
  storeId: Types.ObjectId;
  user: Types.ObjectId;
  products: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const wishlistSchema = new Schema<WishlistAttrs>(
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
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  { timestamps: true },
);

// One wishlist per user per store.
wishlistSchema.index({ storeId: 1, user: 1 }, { unique: true });
wishlistSchema.index({ storeId: 1, products: 1 });

export type WishlistDocument = HydratedDocument<WishlistAttrs>;

export const Wishlist = model<WishlistAttrs>('Wishlist', wishlistSchema);
