/**
 * Deterministic PDP product recommendations.
 * Prefer same-category affinity, then curated complementary kinds.
 * Later sections never repeat products shown above.
 *
 * Pure module — pass a catalog in; do not import asset-backed data here.
 */

import type { CategoryId } from '../pages/Home/types';
import type { SearchProduct } from '../pages/Search/types';
import type { Product } from '../types/product';

export type ProductKind =
  | 'top'
  | 'bottom'
  | 'outerwear'
  | 'bag'
  | 'shoes'
  | 'accessory'
  | 'other';

export interface RecommendationSets {
  related: Product[];
  complementary: Product[];
  discovery: Product[];
}

const RELATED_MAX = 4;
const COMPLEMENTARY_MAX = 3;
const DISCOVERY_MAX = 2;

/** Outfit-completion pairs — extend when the catalog gains bags/shoes/accessories. */
const COMPLEMENTARY_KINDS: Record<ProductKind, readonly ProductKind[]> = {
  top: ['bottom', 'accessory', 'bag', 'shoes'],
  bottom: ['top', 'accessory', 'bag', 'shoes'],
  // Tops browse with coats as related; bottoms/accessories complete the outfit.
  outerwear: ['bottom', 'accessory', 'bag', 'shoes'],
  bag: ['accessory', 'shoes', 'top', 'outerwear'],
  shoes: ['accessory', 'bag', 'bottom', 'top'],
  accessory: ['bag', 'shoes', 'accessory', 'top'],
  other: ['accessory', 'bag'],
};

const KIND_KEYWORDS: Array<{ kind: ProductKind; needles: string[] }> = [
  {
    kind: 'outerwear',
    needles: ['پالتو', 'کت', 'coat', 'outerwear', 'jacket'],
  },
  {
    kind: 'bottom',
    needles: ['شلوار', 'دامن', 'trousers', 'skirt', 'pants'],
  },
  {
    kind: 'top',
    needles: [
      'بلوز',
      'پیراهن',
      'پلیور',
      'blouse',
      'shirt',
      'sweater',
      'top',
    ],
  },
  {
    kind: 'bag',
    needles: ['کیف', 'bag', 'handbag', 'crossbody'],
  },
  {
    kind: 'shoes',
    needles: ['کفش', 'heel', 'shoe', 'sneaker'],
  },
  {
    kind: 'accessory',
    needles: [
      'اکسسوری',
      'گردنبند',
      'دستبند',
      'عینک',
      'necklace',
      'bracelet',
      'sunglasses',
      'accessory',
    ],
  },
];

const CATEGORY_KIND_FALLBACK: Partial<Record<CategoryId, ProductKind>> = {
  bags: 'bag',
  shoes: 'shoes',
  accessories: 'accessory',
};

/** Deduplicate a catalog by product id (Search may include favorite duplicates). */
export function uniqueCatalog(products: SearchProduct[]): SearchProduct[] {
  const seen = new Set<string>();
  const unique: SearchProduct[] = [];

  for (const product of products) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    unique.push(product);
  }

  return unique;
}

export function inferProductKind(product: SearchProduct): ProductKind {
  const haystack = [
    product.name,
    product.href,
    product.description,
    ...(product.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();

  for (const { kind, needles } of KIND_KEYWORDS) {
    if (needles.some((needle) => haystack.includes(needle.toLowerCase()))) {
      return kind;
    }
  }

  return CATEGORY_KIND_FALLBACK[product.category] ?? 'other';
}

function isComplementaryKind(source: ProductKind, target: ProductKind): boolean {
  return COMPLEMENTARY_KINDS[source].includes(target);
}

function priceAffinity(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0;
  const ratio = Math.abs(a - b) / Math.max(a, b);
  return ratio <= 0.35 ? 1 : 0;
}

function tagOverlap(a: SearchProduct, b: SearchProduct): number {
  const left = new Set((a.tags ?? []).map((tag) => tag.toLowerCase()));
  let score = 0;
  for (const tag of b.tags ?? []) {
    if (left.has(tag.toLowerCase())) score += 1;
  }
  return Math.min(score, 3);
}

function toProduct(product: SearchProduct): Product {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    originalPrice: product.originalPrice,
    currency: product.currency,
    imageSrc: product.imageSrc,
    imageAlt: product.imageAlt,
    badge: product.badge,
    href: product.href,
  };
}

function relatedScore(
  current: SearchProduct,
  candidate: SearchProduct,
  currentKind: ProductKind,
  candidateKind: ProductKind,
): number {
  let score = 0;

  if (candidate.category === current.category) score += 5;
  if (candidateKind === currentKind) score += 4;
  if (candidate.material && candidate.material === current.material) score += 2;
  score += tagOverlap(current, candidate);
  score += priceAffinity(current.price, candidate.price);

  if (candidate.category !== current.category) {
    score += 1;
    if (candidate.brand === current.brand) score += 1;
  }

  return score;
}

function complementaryScore(
  current: SearchProduct,
  candidate: SearchProduct,
  currentKind: ProductKind,
  candidateKind: ProductKind,
): number {
  if (candidateKind === currentKind) return 0;

  let score = 0;

  if (isComplementaryKind(currentKind, candidateKind)) score += 5;

  const apparel: CategoryId[] = ['women', 'men'];
  const finishing: CategoryId[] = ['bags', 'shoes', 'accessories'];
  if (
    apparel.includes(current.category) &&
    finishing.includes(candidate.category)
  ) {
    score += 4;
  }

  if (
    candidate.category === current.category &&
    isComplementaryKind(currentKind, candidateKind)
  ) {
    score += 1;
  }

  score += priceAffinity(current.price, candidate.price);

  return score;
}

function sortByScore(
  candidates: SearchProduct[],
  scoreOf: (product: SearchProduct) => number,
): SearchProduct[] {
  return candidates
    .map((product) => ({ product, score: scoreOf(product) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.product.popularity - a.product.popularity;
    })
    .map((entry) => entry.product);
}

function pickByScore(
  candidates: SearchProduct[],
  scoreOf: (product: SearchProduct) => number,
  limit: number,
  minimumScore: number,
): SearchProduct[] {
  return candidates
    .map((product) => ({ product, score: scoreOf(product) }))
    .filter((entry) => entry.score >= minimumScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.product.popularity - a.product.popularity;
    })
    .slice(0, limit)
    .map((entry) => entry.product);
}

function excludeIds(
  products: SearchProduct[],
  usedIds: Set<string>,
): SearchProduct[] {
  return products.filter((product) => !usedIds.has(product.id));
}

function selectRelated(
  current: SearchProduct,
  pool: SearchProduct[],
  currentKind: ProductKind,
): SearchProduct[] {
  const scoreOf = (candidate: SearchProduct) =>
    relatedScore(current, candidate, currentKind, inferProductKind(candidate));

  const complementaryCandidates = pool.filter((candidate) =>
    isComplementaryKind(currentKind, inferProductKind(candidate)),
  );

  // Reserve room for complementary picks when the catalog is small.
  const reserved = Math.min(2, complementaryCandidates.length);
  const relatedLimit =
    complementaryCandidates.length > 0
      ? Math.min(RELATED_MAX, Math.max(2, pool.length - reserved))
      : RELATED_MAX;

  const sameCategory = pool.filter(
    (candidate) => candidate.category === current.category,
  );
  const sameKind = sameCategory.filter(
    (candidate) => inferProductKind(candidate) === currentKind,
  );
  const sameCategoryNonComplementary = sameCategory.filter(
    (candidate) =>
      !isComplementaryKind(currentKind, inferProductKind(candidate)),
  );

  const picked: SearchProduct[] = [];
  const take = (source: SearchProduct[]) => {
    for (const product of sortByScore(source, scoreOf)) {
      if (picked.length >= relatedLimit) break;
      if (picked.some((item) => item.id === product.id)) continue;
      picked.push(product);
    }
  };

  take(sameKind);
  take(sameCategoryNonComplementary);

  // Thin shelves: allow same-category complementary kinds only if we still
  // have fewer than 2 related and no non-complementary peers.
  if (picked.length < 2) {
    take(sameCategory);
  }

  // Final fallback across categories (e.g. sole product in men).
  if (picked.length < 2) {
    take(pool);
  }

  return picked.slice(0, relatedLimit);
}

/**
 * Build related → complementary → discovery sets with cross-section dedupe.
 */
export function getProductRecommendations(
  productId: string,
  catalog: SearchProduct[],
): RecommendationSets {
  const unique = uniqueCatalog(catalog);
  const current = unique.find((product) => product.id === productId);
  if (!current) {
    return { related: [], complementary: [], discovery: [] };
  }

  const currentKind = inferProductKind(current);
  const pool = unique.filter((product) => product.id !== productId);
  const usedIds = new Set<string>([productId]);

  const relatedRaw = selectRelated(current, pool, currentKind);
  relatedRaw.forEach((product) => usedIds.add(product.id));

  const complementaryRaw = pickByScore(
    excludeIds(pool, usedIds),
    (candidate) =>
      complementaryScore(
        current,
        candidate,
        currentKind,
        inferProductKind(candidate),
      ),
    COMPLEMENTARY_MAX,
    4,
  );
  complementaryRaw.forEach((product) => usedIds.add(product.id));

  const discoveryRaw = excludeIds(pool, usedIds)
    .slice()
    .sort(
      (a, b) =>
        b.popularity - a.popularity || b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, DISCOVERY_MAX);

  return {
    related: relatedRaw.map(toProduct),
    complementary: complementaryRaw.map(toProduct),
    discovery: discoveryRaw.map(toProduct),
  };
}

export function getRelatedProducts(
  productId: string,
  catalog: SearchProduct[],
): Product[] {
  return getProductRecommendations(productId, catalog).related;
}

export function getComplementaryProducts(
  productId: string,
  catalog: SearchProduct[],
): Product[] {
  return getProductRecommendations(productId, catalog).complementary;
}

export function getDiscoveryProducts(
  productId: string,
  catalog: SearchProduct[],
): Product[] {
  return getProductRecommendations(productId, catalog).discovery;
}
