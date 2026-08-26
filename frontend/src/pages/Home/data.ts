import type { NavItem, FeatureItem, CategoryItem, FooterColumn } from './types';
import type { Product } from '../../types/product';
import { siteImages } from '../../config/images';
import { homeContent } from '../../config/content';

export const navItems: NavItem[] = [
  { id: 'shop', label: 'فروشگاه', href: '/shop' },
  { id: 'categories', label: 'دسته‌بندی‌ها', href: '/shop' },
  { id: 'new-in', label: 'تازه‌واردها', href: '/shop' },
  { id: 'about', label: 'درباره ما', href: '/about' },
  { id: 'contact', label: 'تماس با ما', href: '/contact' },
];

/** Honest trust claims aligned with Shipping / Returns pages. */
export const featureItems: FeatureItem[] = [
  {
    id: 'shipping',
    icon: 'Truck',
    title: 'ارسال رایگان',
    description: 'سفارش‌های بالای ۵ میلیون تومان',
    href: '/shipping',
  },
  {
    id: 'returns',
    icon: 'RotateCcw',
    title: 'مرجوعی آسان',
    description: 'طبق شرایط فروشگاه',
    href: '/returns',
  },
  {
    id: 'secure',
    icon: 'ShieldCheck',
    title: 'پرداخت امن',
    description: 'خرید آنلاین مطمئن',
    href: '/faq',
  },
  {
    id: 'support',
    icon: 'Headphones',
    title: 'پشتیبانی',
    description: 'همراهی در مسیر خرید',
    href: '/contact',
  },
];

export const categories: CategoryItem[] = [
  {
    id: 'women',
    name: 'زنانه',
    imageSrc: siteImages.categories.women,
    imageAlt: 'پوشاک زنانه لوکسورا',
    href: '/category/women',
  },
  {
    id: 'men',
    name: 'مردانه',
    imageSrc: siteImages.categories.men,
    imageAlt: 'پوشاک مردانه لوکسورا',
    href: '/category/men',
  },
  {
    id: 'bags',
    name: 'کیف',
    imageSrc: siteImages.categories.bags,
    imageAlt: 'کیف‌های لوکسورا',
    href: '/category/bags',
  },
  {
    id: 'shoes',
    name: 'کفش',
    imageSrc: siteImages.categories.shoes,
    imageAlt: 'کفش‌های لوکسورا',
    href: '/category/shoes',
  },
  {
    id: 'accessories',
    name: 'اکسسوری',
    imageSrc: siteImages.categories.accessories,
    imageAlt: 'اکسسوری‌های لوکسورا',
    href: '/category/accessories',
  },
];

/** Six products → clean 2 / 3 / 3–6 grids without orphans on common breakpoints. */
export const bestSellerProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'بلوز حریر',
    price: 1290000,
    currency: 'تومان',
    imageSrc: siteImages.products.silkBlouse,
    imageAlt: 'بلوز حریر',
    href: '/product/silk-blend-blouse',
  },
  {
    id: 'prod-2',
    name: 'پالتو پشمی',
    price: 3490000,
    originalPrice: 4290000,
    currency: 'تومان',
    imageSrc: siteImages.products.woolCoat,
    imageAlt: 'پالتو پشمی',
    badge: 'تخفیف',
    href: '/product/tailored-wool-coat',
  },
  {
    id: 'prod-3',
    name: 'شلوار لینن',
    price: 890000,
    currency: 'تومان',
    imageSrc: siteImages.products.linenTrousers,
    imageAlt: 'شلوار لینن',
    href: '/product/linen-trousers',
  },
  {
    id: 'prod-4',
    name: 'پلیور کشمیر',
    price: 1890000,
    currency: 'تومان',
    imageSrc: siteImages.products.cashmereSweater,
    imageAlt: 'پلیور کشمیر',
    badge: 'جدید',
    href: '/product/cashmere-sweater',
  },
  {
    id: 'prod-5',
    name: 'دامن پیلیسه',
    price: 1590000,
    currency: 'تومان',
    imageSrc: siteImages.products.pleatedSkirt,
    imageAlt: 'دامن پیلیسه',
    href: '/product/pleated-midi-skirt',
  },
  {
    id: 'prod-6',
    name: 'پیراهن سفید کلاسیک',
    price: 790000,
    originalPrice: 990000,
    currency: 'تومان',
    imageSrc: siteImages.products.classicShirt,
    imageAlt: 'پیراهن سفید کلاسیک',
    badge: 'تخفیف',
    href: '/product/classic-white-shirt',
  },
];

/** @deprecated Prefer bestSellerProducts — kept for Search/Product compatibility. */
export const customerFavoriteProducts: Product[] = bestSellerProducts.slice(0, 4);

export const footerColumns: FooterColumn[] = [
  {
    id: 'shop',
    title: 'فروشگاه',
    links: [
      { id: 'shop-new', label: 'تازه‌واردها', href: '/shop' },
      { id: 'shop-women', label: 'زنانه', href: '/category/women' },
      { id: 'shop-men', label: 'مردانه', href: '/category/men' },
      { id: 'shop-bags', label: 'کیف‌ها', href: '/category/bags' },
      { id: 'shop-shoes', label: 'کفش‌ها', href: '/category/shoes' },
    ],
  },
  {
    id: 'customer-service',
    title: 'خدمات مشتریان',
    links: [
      { id: 'service-shipping', label: 'ارسال و بازگشت', href: '/shipping' },
      { id: 'service-returns', label: 'بازگشت کالا', href: '/returns' },
      { id: 'service-faq', label: 'سوالات متداول', href: '/faq' },
      { id: 'service-contact', label: 'تماس با ما', href: '/contact' },
    ],
  },
  {
    id: 'about',
    title: 'درباره لوکسورا',
    links: [
      { id: 'about-story', label: 'داستان ما', href: '/about' },
      { id: 'about-shipping', label: 'ارسال و تحویل', href: '/shipping' },
      { id: 'about-privacy', label: 'حریم خصوصی', href: '/privacy' },
      { id: 'about-terms', label: 'شرایط استفاده', href: '/terms' },
      { id: 'about-contact', label: 'ارتباط با ما', href: '/contact' },
    ],
  },
];

export const heroContent = {
  eyebrow: homeContent.hero.eyebrow,
  title: homeContent.hero.title,
  description: homeContent.hero.description,
  primaryCta: homeContent.hero.primaryCta,
  imageSrc: siteImages.hero.main,
  imageAlt: 'مدل فشن لوکسورا — پوشاک و اکسسوری',
};

export const promoBannerContent = {
  title: homeContent.promo.title,
  description: homeContent.promo.description,
  ctaLabel: homeContent.promo.ctaLabel,
  ctaHref: homeContent.promo.ctaHref,
  imageSrc: siteImages.banners.promo,
  imageAlt: 'اکسسوری و استایل فصل لوکسورا',
};
