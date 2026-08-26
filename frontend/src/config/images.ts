/**
 * LUXORA — CENTRAL IMAGE CONFIG
 *
 * تمام تصاویر سایت از این فایل مدیریت می‌شوند.
 * برای تغییر تصاویر، فقط import و مقدار مربوطه را تغییر بده.
 */

import hero from '../assets/hero.webp';

import women from '../assets/images/categories/women.webp';
import men from '../assets/images/categories/men.webp';
import bag from '../assets/images/categories/bag.webp';
import shoes from '../assets/images/categories/Shoes.webp';

import silkBlouse from '../assets/images/products/silk-blouse.webp';
import woolCoat from '../assets/images/products/wool-coat.webp';
import linenTrousers from '../assets/images/products/linen-trousers.webp';
import cashmereSweater from '../assets/images/products/cashmere-sweater.webp';
import pleatedSkirt from '../assets/images/products/pleated-skirt.webp';
import classicShirt from '../assets/images/products/classic-shirt.webp';
import accessories from '../assets/images/categories/accessories.webp';
import promo from '../assets/images/banners/luxora-promo-woman.webp';

export const siteImages = {
  hero: {
    main: hero,
  },

  categories: {
    women,
    men,
    bags: bag,
    shoes,
    accessories
  },

  products: {
    silkBlouse,
    woolCoat,
    linenTrousers,
    cashmereSweater,
    pleatedSkirt,
    classicShirt,
  },

  banners: {
    promo,
  },
} as const;

/**
 * Backwards compatibility
 * بعضی فایل‌های قدیمی پروژه هنوز از categoryImages استفاده می‌کنند.
 */
export const categoryImages = siteImages.categories;
