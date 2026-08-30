import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import {
  DEFAULT_CURRENCY,
  PRODUCT_KINDS,
  PRODUCT_STATUSES,
  type ProductKind,
  type ProductStatus,
} from '../config/constants';

export interface ProductImageAttrs {
  url: string;
  alt?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductColorAttrs {
  name: string;
  hex: string;
}

export interface ProductAttrs {
  storeId: Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  shortDescription?: string;
  description?: string;
  category: Types.ObjectId;
  productKind: ProductKind;
  price: number;
  salePrice?: number;
  currency: string;
  images: ProductImageAttrs[];
  colors: ProductColorAttrs[];
  sizes: string[];
  stock: number;
  lowStockThreshold: number;
  status: ProductStatus;
  featured: boolean;
  badge?: string;
  tags: string[];
  material?: string;
  brand?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema<ProductImageAttrs>(
  {
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    alt: { type: String, trim: true, maxlength: 200 },
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true },
);

const productColorSchema = new Schema<ProductColorAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    hex: { type: String, required: true, trim: true, maxlength: 20 },
  },
  { _id: false },
);

const productSchema = new Schema<ProductAttrs>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 64,
    },
    shortDescription: { type: String, trim: true, maxlength: 400 },
    description: { type: String, trim: true, maxlength: 10000 },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    productKind: {
      type: String,
      enum: PRODUCT_KINDS,
      required: true,
      default: 'other',
    },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    currency: {
      type: String,
      required: true,
      default: DEFAULT_CURRENCY,
      maxlength: 32,
    },
    images: { type: [productImageSchema], default: [] },
    colors: { type: [productColorSchema], default: [] },
    sizes: { type: [String], default: [] },
    stock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0, default: 5 },
    status: {
      type: String,
      enum: PRODUCT_STATUSES,
      required: true,
      default: 'draft',
    },
    featured: { type: Boolean, default: false },
    badge: { type: String, trim: true, maxlength: 40 },
    tags: { type: [String], default: [] },
    material: { type: String, trim: true, maxlength: 80 },
    brand: { type: String, trim: true, maxlength: 80 },
  },
  { timestamps: true },
);

// Per-store unique identity.
productSchema.index({ storeId: 1, slug: 1 }, { unique: true });
productSchema.index({ storeId: 1, sku: 1 }, { unique: true });
// Catalog list patterns — storeId leading for ~1000-store shared cluster.
productSchema.index({ storeId: 1, status: 1, createdAt: -1 });
productSchema.index({ storeId: 1, status: 1, featured: 1, createdAt: -1 });
productSchema.index({ storeId: 1, status: 1, category: 1, createdAt: -1 });
productSchema.index({ storeId: 1, status: 1, price: 1 });
productSchema.index({ storeId: 1, status: 1, salePrice: 1 });
productSchema.index({ storeId: 1, status: 1, productKind: 1 });
productSchema.index({ storeId: 1, status: 1, stock: 1 });

export type ProductDocument = HydratedDocument<ProductAttrs>;

export const Product = model<ProductAttrs>('Product', productSchema);
