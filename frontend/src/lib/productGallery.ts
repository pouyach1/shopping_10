/**
 * Storefront product gallery helpers.
 * Deduplicates legacy imageSrc / gallery / images into a real image list.
 */

export type GalleryImage = {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
};

type GallerySource = {
  name: string;
  imageSrc?: string;
  imageAlt?: string;
  gallery?: string[];
  images?: Array<{
    id?: string;
    url: string;
    alt?: string;
    isPrimary?: boolean;
  }>;
};

function createImageId(index: number): string {
  return `gallery-${index}`;
}

/**
 * Builds an ordered, de-duplicated gallery.
 * Never pads with duplicate copies of the same URL.
 */
export function normalizeGalleryImages(product: GallerySource): GalleryImage[] {
  const seen = new Set<string>();
  const result: GalleryImage[] = [];

  const push = (url: string, alt: string, isPrimary: boolean) => {
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push({
      id: createImageId(result.length),
      url: trimmed,
      alt: alt || product.name,
      isPrimary,
    });
  };

  if (product.images && product.images.length > 0) {
    const sorted = [...product.images].sort((a, b) => {
      if (a.isPrimary === b.isPrimary) return 0;
      return a.isPrimary ? -1 : 1;
    });
    for (const image of sorted) {
      push(image.url, image.alt || product.imageAlt || product.name, Boolean(image.isPrimary));
    }
  } else {
    if (product.imageSrc) {
      push(product.imageSrc, product.imageAlt || product.name, true);
    }
    for (const entry of product.gallery ?? []) {
      push(entry, product.imageAlt || product.name, false);
    }
  }

  if (result.length === 0) return [];

  const hasPrimary = result.some((image) => image.isPrimary);
  return result.map((image, index) => ({
    ...image,
    isPrimary: hasPrimary ? image.isPrimary : index === 0,
  }));
}
