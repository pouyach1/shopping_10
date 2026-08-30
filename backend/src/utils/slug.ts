/**
 * URL-safe slug helpers for catalog identities (products, categories).
 * Persian names are not transliterated automatically — callers should provide
 * Latin slugs for storefront routes, matching the existing frontend.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isValidSlug(input: string): boolean {
  const normalized = normalizeSlug(input);
  return normalized.length >= 2 && normalized.length <= 120 && SLUG_PATTERN.test(normalized);
}

export function assertValidSlug(input: string): string {
  const normalized = normalizeSlug(input);
  if (!isValidSlug(normalized)) {
    throw new Error('INVALID_SLUG');
  }
  return normalized;
}

/** Append -2, -3, ... until unique. */
export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const normalized = normalizeSlug(base);
  if (!normalized) {
    throw new Error('INVALID_SLUG');
  }

  if (!(await exists(normalized))) return normalized;

  let n = 2;
  while (n < 1000) {
    const candidate = `${normalized}-${n}`;
    if (!(await exists(candidate))) return candidate;
    n += 1;
  }
  throw new Error('SLUG_COLLISION');
}
