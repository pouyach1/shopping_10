import { useMemo, useState } from 'react';

import type { CategoryId } from '../pages/Home/types';
import type {
  SearchFilters,
  SortOption,
} from '../pages/Search/types';

import {
  DEFAULT_FILTERS,
} from '../pages/Search/types';

import {
  searchableProducts,
  materialOptions,
  brandOptions,
  sizeOptions,
} from '../pages/Search/data';

interface UseSearchOptions {
  initialCategories?: CategoryId[];
}

export function useSearch(
  initialQuery = '',
  options: UseSearchOptions = {},
) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    ...DEFAULT_FILTERS,
    priceRange: [...DEFAULT_FILTERS.priceRange] as [number, number],
    categories: options.initialCategories ?? [],
  }));

  const [sortBy, setSortBy] =
    useState<SortOption>('popular');

  const filteredProducts = useMemo(() => {
    let results = [...searchableProducts];

    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery) {
      results = results.filter((product) => {
        const searchableText = [
          product.name,
          product.description,
          ...product.tags,
          product.category,
          product.material,
          product.brand,
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      });
    }

    if (filters.categories.length) {
      results = results.filter((product) =>
        filters.categories.includes(product.category),
      );
    }

    if (filters.materials.length) {
      results = results.filter((product) =>
        filters.materials.includes(product.material),
      );
    }

    if (filters.brands.length) {
      results = results.filter((product) =>
        filters.brands.includes(product.brand),
      );
    }

    if (filters.sizes.length) {
      results = results.filter((product) =>
        product.sizes.some((size) =>
          filters.sizes.includes(size),
        ),
      );
    }

    results = results.filter(
      (product) =>
        product.price >= filters.priceRange[0] &&
        product.price <= filters.priceRange[1],
    );

    switch (sortBy) {
      case 'price_asc':
        results.sort((a, b) => a.price - b.price);
        break;

      case 'price_desc':
        results.sort((a, b) => b.price - a.price);
        break;

      case 'popular':
        results.sort(
          (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
        );
        break;

      case 'newest':
        results.sort(
          (a, b) =>
            new Date(b.createdAt ?? '1970-01-01').getTime() -
            new Date(a.createdAt ?? '1970-01-01').getTime(),
        );
        break;
    }

    return results;
  }, [query, filters, sortBy]);

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return [];

    const seen = new Set<string>();

    return searchableProducts
      .flatMap((product) => {
        const values = [
          {
            id: `product-${product.id}`,
            text: product.name,
            type: 'product' as const,
          },
          ...product.tags.map((tag) => ({
            id: `tag-${product.id}-${tag}`,
            text: tag,
            type: 'tag' as const,
          })),
        ];

        return values;
      })
      .filter((item) => {
        const matches = item.text
          .toLowerCase()
          .includes(normalizedQuery);

        if (!matches || seen.has(item.text)) return false;

        seen.add(item.text);
        return true;
      })
      .slice(0, 7);
  }, [query]);

  const filterOptions = useMemo(() => {
    const source = searchableProducts;

    return {
      materials: materialOptions.map((material) => ({
        id: material,
        label: material,
        count: source.filter(
          (product) => product.material === material,
        ).length,
      })),

      brands: brandOptions.map((brand) => ({
        id: brand,
        label: brand,
        count: source.filter(
          (product) => product.brand === brand,
        ).length,
      })),

      sizes: sizeOptions.map((size) => ({
        id: size,
        label: size,
        count: source.filter(
          (product) => product.sizes.includes(size),
        ).length,
      })),
    };
  }, []);

  const activeFilterCount =
    filters.categories.length +
    filters.materials.length +
    filters.brands.length +
    filters.sizes.length +
    (filters.priceRange[0] !== DEFAULT_FILTERS.priceRange[0] ||
    filters.priceRange[1] !== DEFAULT_FILTERS.priceRange[1]
      ? 1
      : 0);

  const clearFilters = () => {
    setFilters({
      ...DEFAULT_FILTERS,
      priceRange: [...DEFAULT_FILTERS.priceRange] as [
        number,
        number,
      ],
    });
  };

  const updateFilters = (
    partial: Partial<SearchFilters>,
  ) => {
    setFilters((previous) => ({
      ...previous,
      ...partial,
    }));
  };

  return {
    query,
    setQuery,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    filteredProducts,
    suggestions,
    filterOptions,
    activeFilterCount,
    clearFilters,
    updateFilters,
    totalResults: filteredProducts.length,
  };
}
