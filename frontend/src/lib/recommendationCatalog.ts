import { searchableProducts } from '../pages/Search/data';
import type { SearchProduct } from '../pages/Search/types';
import { uniqueCatalog } from './productRecommendations';

/** Storefront catalog for PDP recommendations (unique Search products). */
export function getRecommendationCatalog(): SearchProduct[] {
  return uniqueCatalog(searchableProducts);
}
