import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface CategoryAttrs {
  storeId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryAttrs>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    image: { type: String, trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true, required: true },
    sortOrder: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
);

// Per-store unique slug.
categorySchema.index({ storeId: 1, slug: 1 }, { unique: true });
// Public category list for a store.
categorySchema.index({ storeId: 1, isActive: 1, sortOrder: 1 });

export type CategoryDocument = HydratedDocument<CategoryAttrs>;
export type CategoryId = Types.ObjectId | string;

export const Category = model<CategoryAttrs>('Category', categorySchema);
