import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface CategoryAttrs {
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
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 120,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    image: { type: String, trim: true, maxlength: 1000 },
    // Soft-deactivate uses isActive=false; unique slug remains so reactivation
    // and URL stability stay intact (no TTL / destructive unique-partial index).
    isActive: { type: Boolean, default: true, required: true },
    sortOrder: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
);

// Serves: public category list — filter isActive + sort by sortOrder.
// Replaces redundant single-field isActive / sortOrder indexes.
categorySchema.index({ isActive: 1, sortOrder: 1 });

export type CategoryDocument = HydratedDocument<CategoryAttrs>;
export type CategoryId = Types.ObjectId | string;

export const Category = model<CategoryAttrs>('Category', categorySchema);
