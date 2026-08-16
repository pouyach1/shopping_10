import type { NavItem, FeatureItem, CategoryItem, Product, Testimonial, SocialImage, FooterColumn } from './types';
import { siteImages } from '../../config/images';

export const navItems: NavItem[] = [
  { id: 'new-in', label: 'تازه‌واردها', href: '/new-in' },
  { id: 'shop', label: 'فروشگاه', href: '/shop' },
  { id: 'collections', label: 'مجموعه‌ها', href: '/collections' },
  { id: 'about', label: 'درباره ما', href: '/about' },
  { id: 'journal', label: 'مجله', href: '/journal' },
];

export const featureItems: FeatureItem[] = [
  { id: 'shipping', icon: 'Truck', title: 'ارسال رایگان', description: 'به سراسر کشور' },
  { id: 'returns', icon: 'RotateCcw', title: 'ضمانت ۳۰ روزه', description: 'بازگشت آسان' },
  { id: 'secure', icon: 'ShieldCheck', title: 'پرداخت امن', description: 'خرید مطمئن' },
  { id: 'quality', icon: 'Award', title: 'کیفیت برتر', description: 'ضمانت اصالت' },
  { id: 'support', icon: 'Headphones', title: 'پشتیبانی ۲۴/۷', description: 'همیشه در کنار شما' },
];

export const categories: CategoryItem[] = [
  { id: 'women', name: 'WOMEN', imageSrc: siteImages.categories.women, imageAlt: 'Women luxury fashion editorial', href: '/category/women' },
  { id: 'men', name: 'MEN', imageSrc: siteImages.categories.men, imageAlt: 'Men luxury fashion editorial', href: '/category/men' },
  { id: 'bags', name: 'BAGS', imageSrc: siteImages.categories.bags, imageAlt: 'Premium leather handbag', href: '/category/bags' },
  { id: 'shoes', name: 'SHOES', imageSrc: siteImages.categories.shoes, imageAlt: 'Luxury fashion footwear', href: '/category/shoes' },
  { id: 'accessories', name: 'ACCESSORIES', imageSrc: siteImages.categories.accessories, imageAlt: 'Premium luxury accessories', href: '/category/accessories' },
];

export const bestSellerProducts: Product[] = [
  { id: 'prod-1', name: 'بلوز حریر', price: 1290000, currency: 'تومان', imageSrc: siteImages.products.silkBlouse, imageAlt: 'بلوز حریر', href: '/product/silk-blend-blouse' },
  { id: 'prod-2', name: 'پالتو پشمی', price: 3490000, originalPrice: 4290000, currency: 'تومان', imageSrc: siteImages.products.woolCoat, imageAlt: 'پالتو پشمی', badge: 'تخفیف', href: '/product/tailored-wool-coat' },
  { id: 'prod-3', name: 'شلوار لینن', price: 890000, currency: 'تومان', imageSrc: siteImages.products.linenTrousers, imageAlt: 'شلوار لینن', href: '/product/linen-trousers' },
  { id: 'prod-4', name: 'پلیور کشمیر', price: 1890000, currency: 'تومان', imageSrc: siteImages.products.cashmereSweater, imageAlt: 'پلیور کشمیر', badge: 'جدید', href: '/product/cashmere-sweater' },
  { id: 'prod-5', name: 'دامن پیلیسه', price: 1590000, currency: 'تومان', imageSrc: siteImages.products.pleatedSkirt, imageAlt: 'دامن پیلیسه', href: '/product/pleated-midi-skirt' },
  { id: 'prod-6', name: 'پیراهن سفید کلاسیک', price: 790000, originalPrice: 990000, currency: 'تومان', imageSrc: siteImages.products.classicShirt, imageAlt: 'پیراهن سفید کلاسیک', badge: 'تخفیف', href: '/product/classic-white-shirt' },
];

export const customerFavoriteProducts: Product[] = [
  { id: 'fav-1', name: 'پالتو پشمی', price: 3490000, currency: 'تومان', imageSrc: siteImages.products.woolCoat, imageAlt: 'پالتو پشمی', href: '/product/tailored-wool-coat' },
  { id: 'fav-2', name: 'بلوز حریر', price: 1290000, currency: 'تومان', imageSrc: siteImages.products.silkBlouse, imageAlt: 'بلوز حریر', href: '/product/silk-blend-blouse' },
  { id: 'fav-3', name: 'پلیور کشمیر', price: 1890000, currency: 'تومان', imageSrc: siteImages.products.cashmereSweater, imageAlt: 'پلیور کشمیر', href: '/product/cashmere-sweater' },
  { id: 'fav-4', name: 'دامن پیلیسه', price: 1590000, currency: 'تومان', imageSrc: siteImages.products.pleatedSkirt, imageAlt: 'دامن پیلیسه', href: '/product/pleated-midi-skirt' },
];

export const testimonials: Testimonial[] = [
  {
    id: 'test-1',
    quote: 'کیفیت پارچه فوق‌العاده است و اندازه لباس کاملاً دقیق بود. هرگز این‌قدر از خرید لباس مطمئن نبوده‌ام.',
    author: 'الناز محمدی',
    role: 'مشتری تاییدشده',
    rating: 5,
  },
  {
    id: 'test-2',
    quote: 'دقت در جزئیات واقعاً چشمگیر است. هر لباسی که خریدم انگار برای خودم دوخته شده.',
    author: 'سارا احمدی',
    role: 'مشتری تاییدشده',
    rating: 5,
  },
];

export const socialImages: SocialImage[] = [
  { id: 'social-1', imageSrc: siteImages.products.silkBlouse, imageAlt: 'پست اینستاگرام ۱', href: 'https://instagram.com' },
  { id: 'social-2', imageSrc: siteImages.products.woolCoat, imageAlt: 'پست اینستاگرام ۲', href: 'https://instagram.com' },
  { id: 'social-3', imageSrc: siteImages.products.cashmereSweater, imageAlt: 'پست اینستاگرام ۳', href: 'https://instagram.com' },
  { id: 'social-4', imageSrc: siteImages.products.pleatedSkirt, imageAlt: 'پست اینستاگرام ۴', href: 'https://instagram.com' },
  { id: 'social-5', imageSrc: siteImages.products.linenTrousers, imageAlt: 'پست اینستاگرام ۵', href: 'https://instagram.com' },
  { id: 'social-6', imageSrc: siteImages.products.classicShirt, imageAlt: 'پست اینستاگرام ۶', href: 'https://instagram.com' },
];

export const footerColumns: FooterColumn[] = [
  {
    id: 'shop',
    title: 'فروشگاه',
    links: [
      { id: 'shop-new', label: 'تازه‌واردها', href: '/new-in' },
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
      { id: 'service-size', label: 'راهنمای سایز', href: '/size-guide' },
      { id: 'service-faq', label: 'سوالات متداول', href: '/faq' },
      { id: 'service-contact', label: 'تماس با ما', href: '/contact' },
      { id: 'service-support', label: 'پشتیبانی', href: '/support' },
    ],
  },
  {
    id: 'about',
    title: 'درباره LUXORA',
    links: [
      { id: 'about-story', label: 'داستان ما', href: '/about' },
      { id: 'about-journal', label: 'مجله LUXORA', href: '/journal' },
      { id: 'about-collections', label: 'مجموعه‌ها', href: '/collections' },
      { id: 'about-careers', label: 'فرصت‌های همکاری', href: '/careers' },
      { id: 'about-contact', label: 'ارتباط با ما', href: '/contact' },
    ],
  },
];

export const heroContent = {
  eyebrow: 'SPRING / SUMMER 2026',
  title: 'ELEGANCE,\nREIMAGINED',
  description: 'Timeless silhouettes. Modern craftsmanship.\nDesigned for the now and forever.',
  primaryCta: { label: 'SHOP THE COLLECTION', href: '/shop' },
  secondaryCta: { label: 'LOOKBOOK', href: '/lookbook' },
  imageSrc: siteImages.hero.main,
  imageAlt: 'Luxora fashion model',
  currentSlide: 1,
  totalSlides: 4,
};

export const promoBannerContent = {
  title: 'فراتر از یک انتخاب.',
  imageSrc: siteImages.banners.promo,
  imageAlt: 'استایل زنانه لوکس LUXORA',
};

export const instagramContent = {
  title: 'استایل ما را دنبال کنید',
  handle: '@luxora',
  images: socialImages,
};

export const secondaryNavItems = [
  { label: 'صفحه اصلی', href: '/' },
  { label: 'فروشگاه', href: '/shop' },
  { label: 'درباره ما', href: '/about' },
  { label: 'تماس با ما', href: '/contact' },
];
