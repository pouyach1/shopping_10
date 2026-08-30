/**
 * Isolated catalog search filter builder.
 * Controllers/services call this instead of embedding regex/$text details,
 * so a future search provider can replace this module without rewriting routes.
 *
 * Searches: name, shortDescription, description, sku, tags.
 */
export function buildProductSearchFilter(
  search: string | undefined,
): Record<string, unknown> | undefined {
  if (!search) return undefined;
  const term = search.trim();
  if (!term) return undefined;

  // Escape regex metacharacters to prevent ReDoS / injection via user input.
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  return {
    $or: [
      { name: regex },
      { shortDescription: regex },
      { description: regex },
      { sku: regex },
      { tags: regex },
    ],
  };
}
