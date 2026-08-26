export type ProductStatus = 'active' | 'draft' | 'archived';

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  categoryId: string;
  description?: string;

  price: number;
  originalPrice?: number;
  currency: string;

  imageSrc?: string;
  imageAlt?: string;
  gallery?: string[];

  badge?: string;

  sizes?: string[];

  colors?: {
    name: string;
    hex: string;
  }[];

  stock: number;
  lowStockThreshold: number;

  status: ProductStatus;

  createdAt: string;
  updatedAt: string;
}
