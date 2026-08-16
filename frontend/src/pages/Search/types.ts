import type { CategoryId, Product } from '../Home/types';

export interface SearchProduct extends Product {
  category: CategoryId;
  description: string;
  tags: string[];
  material: string;
  brand: string;
  sizes: string[];
  popularity: number;
  createdAt: string;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type?: 'product' | 'category' | 'tag' | 'brand';
}

export interface TrendingSearch {
  id: string;
  term: string;
}

export interface SearchCategory {
  id: CategoryId;
  name: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
}

export interface FilterOption {
  id: string;
  label: string;
  count: number;
}

export interface SearchFilters {
  categories: CategoryId[];
  materials: string[];
  brands: string[];
  sizes: string[];
  priceRange: [number, number];
}

export type SortOption =
  | 'newest'
  | 'popular'
  | 'price_asc'
  | 'price_desc';

export const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'newest', label: 'جدیدترین' },
  { id: 'popular', label: 'محبوب‌ترین' },
  { id: 'price_asc', label: 'ارزان‌ترین' },
  { id: 'price_desc', label: 'گران‌ترین' },
];

export const DEFAULT_PRICE_RANGE: [number, number] = [0, 5000000];

export const DEFAULT_FILTERS: SearchFilters = {
  categories: [],
  materials: [],
  brands: [],
  sizes: [],
  priceRange: DEFAULT_PRICE_RANGE,
};
