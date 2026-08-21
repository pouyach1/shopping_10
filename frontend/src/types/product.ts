import type { Currency } from './common';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: Currency;
  imageSrc: string;
  imageAlt: string;
  badge?: string;
  href: string;
}
