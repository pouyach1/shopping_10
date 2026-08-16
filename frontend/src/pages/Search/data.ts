import type { SearchProduct, TrendingSearch } from './types';
import { bestSellerProducts, customerFavoriteProducts } from '../Home/data';

export const trendingSearches: TrendingSearch[] = [
  { id: 'trend-1', term: 'پالتو پشمی' },
  { id: 'trend-2', term: 'کیف چرمی' },
  { id: 'trend-3', term: 'کفش زنانه' },
  { id: 'trend-4', term: 'پیراهن مشکی' },
  { id: 'trend-5', term: 'اکسسوری' },
  { id: 'trend-6', term: 'کالکشن جدید' },
];

export const searchableProducts: SearchProduct[] = [
  {
    ...bestSellerProducts[0],
    category: 'women',
    description: 'بلوزی ظریف با فرم مینیمال و پارچه‌ای سبک برای استایل روزمره.',
    tags: ['بلوز', 'حریر', 'زنانه', 'مینیمال'],
    material: 'Silk',
    brand: 'LUXORA',
    sizes: ['S', 'M', 'L'],
    popularity: 50,
    createdAt: '2026-01-01',
  },
  {
    ...bestSellerProducts[1],
    category: 'women',
    description: 'پالتوی پشمی با ساختار Tailored و سیلوئت تمیز.',
    tags: ['پالتو', 'پشمی', 'زمستانی', 'لوکس'],
    material: 'Wool',
    brand: 'LUXORA',
    sizes: ['M', 'L', 'XL'],
    popularity: 50,
    createdAt: '2026-01-01',
  },
  {
    ...bestSellerProducts[2],
    category: 'men',
    description: 'شلوار لینن با فرم آزاد و رنگ خنثی.',
    tags: ['شلوار', 'لینن', 'مردانه'],
    material: 'Linen',
    brand: 'LUXORA',
    sizes: ['S', 'M', 'L', 'XL'],
    popularity: 50,
    createdAt: '2026-01-01',
  },
  {
    ...bestSellerProducts[3],
    category: 'women',
    description: 'پلیور کشمیر نرم با بافت ظریف.',
    tags: ['پلیور', 'کشمیر', 'گرم', 'لوکس'],
    material: 'Cashmere',
    brand: 'LUXORA',
    sizes: ['S', 'M', 'L'],
    popularity: 50,
    createdAt: '2026-01-01',
  },
  {
    ...bestSellerProducts[4],
    category: 'women',
    description: 'دامن پیلیسه با حرکت پارچه طبیعی.',
    tags: ['دامن', 'پیلیسه', 'زنانه'],
    material: 'Polyester',
    brand: 'LUXORA',
    sizes: ['XS', 'S', 'M'],
    popularity: 50,
    createdAt: '2026-01-01',
  },
  {
    ...bestSellerProducts[5],
    category: 'women',
    description: 'پیراهن سفید کلاسیک با دوخت تمیز.',
    tags: ['پیراهن', 'سفید', 'کلاسیک'],
    material: 'Cotton',
    brand: 'LUXORA',
    sizes: ['S', 'M', 'L', 'XL'],
    popularity: 50,
    createdAt: '2026-01-01',
  },
  {
    ...customerFavoriteProducts[0],
    category: 'women',
    description: 'پالتو پشمی محبوب مشتریان.',
    tags: ['پالتو', 'پشمی', 'محبوب'],
    material: 'Wool',
    brand: 'LUXORA',
    sizes: ['M', 'L'],
    popularity: 50,
    createdAt: '2026-01-01',
  },
  {
    ...customerFavoriteProducts[1],
    category: 'women',
    description: 'بلوز حریر محبوب برای استایل روزمره.',
    tags: ['بلوز', 'حریر', 'محبوب'],
    material: 'Silk',
    brand: 'LUXORA',
    sizes: ['S', 'M'],
    popularity: 50,
    createdAt: '2026-01-01',
  },
];

export const materialOptions = ['Silk', 'Wool', 'Cotton', 'Linen', 'Cashmere', 'Polyester'];

export const brandOptions = ['LUXORA', 'LUXORA STUDIO', 'LUXORA EDIT'];

export const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const quickCategories = [
  {
    id: 'women' as const,
    name: 'WOMEN',
    href: '/category/women',
    imageSrc: '/images/search/categories/women.webp',
    imageAlt: 'Women luxury fashion',
  },
  {
    id: 'men' as const,
    name: 'MEN',
    href: '/category/men',
    imageSrc: '/images/search/categories/men.webp',
    imageAlt: 'Men luxury fashion',
  },
  {
    id: 'bags' as const,
    name: 'BAGS',
    href: '/category/bags',
    imageSrc: '/images/search/categories/bags.webp',
    imageAlt: 'Luxury bags',
  },
  {
    id: 'shoes' as const,
    name: 'SHOES',
    href: '/category/shoes',
    imageSrc: '/images/search/categories/shoes.webp',
    imageAlt: 'Luxury shoes',
  },
  {
    id: 'accessories' as const,
    name: 'ACCESSORIES',
    href: '/category/accessories',
    imageSrc: '/images/search/categories/accessories.webp',
    imageAlt: 'Luxury accessories',
  },
];