import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface WishlistAttrs {
  user: Types.ObjectId;
  /** Unique product references — duplicates rejected at service layer. */
  products: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const wishlistSchema = new Schema<WishlistAttrs>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
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

wishlistSchema.index({ products: 1 });

export type WishlistDocument = HydratedDocument<WishlistAttrs>;

export const Wishlist = model<WishlistAttrs>('Wishlist', wishlistSchema);
