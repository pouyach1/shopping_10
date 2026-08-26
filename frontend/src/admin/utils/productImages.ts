import type { AdminProduct, ProductImage } from '../types/product';

function createImageId(): string {
  return `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Normalize legacy `imageSrc` / `gallery` into `images[]`.
 * Existing seed products keep working without manual migration.
 */
export function normalizeProductImages(
  product: Pick<AdminProduct, 'images' | 'imageSrc' | 'imageAlt' | 'gallery' | 'name'>,
): ProductImage[] {
  if (product.images && product.images.length > 0) {
    return ensureSinglePrimary(
      product.images.map((image) => ({
        id: image.id || createImageId(),
        url: image.url,
        alt: image.alt,
        isPrimary: Boolean(image.isPrimary),
      })),
    );
  }

  const images: ProductImage[] = [];
  const seen = new Set<string>();

  if (product.imageSrc?.trim()) {
    const url = product.imageSrc.trim();
    seen.add(url);
    images.push({
      id: createImageId(),
      url,
      alt: product.imageAlt || product.name,
      isPrimary: true,
    });
  }

  for (const entry of product.gallery ?? []) {
    const url = entry.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    images.push({
      id: createImageId(),
      url,
      alt: product.imageAlt || product.name,
      isPrimary: false,
    });
  }

  return ensureSinglePrimary(images);
}

export function ensureSinglePrimary(images: ProductImage[]): ProductImage[] {
  if (images.length === 0) return [];

  const primaryIndex = images.findIndex((image) => image.isPrimary);
  return images.map((image, index) => ({
    ...image,
    isPrimary: primaryIndex >= 0 ? index === primaryIndex : index === 0,
  }));
}

export function getPrimaryImage(images: ProductImage[]): ProductImage | undefined {
  return images.find((image) => image.isPrimary) ?? images[0];
}

/** Keep legacy fields derived from `images` for list/dashboard/storefront. */
export function syncLegacyImageFields(images: ProductImage[]): {
  imageSrc?: string;
  imageAlt?: string;
  gallery?: string[];
} {
  const normalized = ensureSinglePrimary(images);
  const primary = getPrimaryImage(normalized);

  if (!primary) {
    return {
      imageSrc: undefined,
      imageAlt: undefined,
      gallery: [],
    };
  }

  return {
    imageSrc: primary.url,
    imageAlt: primary.alt,
    gallery: normalized
      .filter((image) => image.id !== primary.id)
      .map((image) => image.url),
  };
}

export function normalizeAdminProduct(product: AdminProduct): AdminProduct {
  const images = normalizeProductImages(product);
  const legacy = syncLegacyImageFields(images);
  return {
    ...product,
    images,
    ...legacy,
  };
}

export function setPrimaryImage(
  images: ProductImage[],
  imageId: string,
): ProductImage[] {
  return images.map((image) => ({
    ...image,
    isPrimary: image.id === imageId,
  }));
}

export function reorderImages(
  images: ProductImage[],
  fromIndex: number,
  toIndex: number,
): ProductImage[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= images.length ||
    toIndex >= images.length ||
    fromIndex === toIndex
  ) {
    return images;
  }

  const next = images.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return ensureSinglePrimary(next);
}
