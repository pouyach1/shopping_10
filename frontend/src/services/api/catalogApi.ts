import { apiRequest } from './http';

export interface PublicCatalogProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number;
  displayPrice: number;
  originalPrice?: number;
  currency: string;
  imageSrc?: string;
  imageAlt?: string;
  href: string;
  stock: number;
  status: string;
}

export async function fetchProductBySlug(
  slug: string,
): Promise<PublicCatalogProduct | null> {
  try {
    const data = await apiRequest<{ product: PublicCatalogProduct }>(
      `/api/v1/products/${encodeURIComponent(slug)}`,
      { auth: false },
    );
    return data.product;
  } catch {
    return null;
  }
}

/** Resolve a storefront product id — Mongo id or slug from href. */
export async function resolveBackendProductId(input: {
  id: string;
  href?: string;
}): Promise<string | null> {
  if (/^[a-fA-F0-9]{24}$/.test(input.id)) return input.id;
  const slug = input.href?.split('/').filter(Boolean).pop();
  if (!slug) return null;
  const product = await fetchProductBySlug(slug);
  return product?.id ?? null;
}
