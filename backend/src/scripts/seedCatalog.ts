/**
 * Idempotent development catalog seed.
 *
 * Usage:
 *   cd backend && npm run seed
 *
 * Safe to run twice — upserts by slug / sku.
 * Does not invent reviews or customer data.
 */

import { connectDB, disconnectDB } from '../config/db';
import { env } from '../config/env';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { User } from '../models/User';
import type { ProductKind } from '../config/constants';
import { hashPassword } from '../utils/password';
import { logger } from '../utils/logger';

/** Stable relative asset paths — match frontend `src/assets/images/...`. */
const IMG = {
  women: '/assets/images/categories/women.webp',
  men: '/assets/images/categories/men.webp',
  bags: '/assets/images/categories/bag.webp',
  shoes: '/assets/images/categories/Shoes.webp',
  accessories: '/assets/images/categories/accessories.webp',
  silkBlouse: '/assets/images/products/silk-blouse.webp',
  woolCoat: '/assets/images/products/wool-coat.webp',
  linenTrousers: '/assets/images/products/linen-trousers.webp',
  cashmereSweater: '/assets/images/products/cashmere-sweater.webp',
  pleatedSkirt: '/assets/images/products/pleated-skirt.webp',
  classicShirt: '/assets/images/products/classic-shirt.webp',
} as const;

const SEED_CATEGORIES = [
  {
    name: 'زنانه',
    slug: 'women',
    description: 'پوشاک و اکسسوری زنانه لوکسورا',
    image: IMG.women,
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'مردانه',
    slug: 'men',
    description: 'پوشاک مردانه با برش کلاسیک',
    image: IMG.men,
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'کیف',
    slug: 'bags',
    description: 'کیف‌های چرمی و پارچه‌ای',
    image: IMG.bags,
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'کفش',
    slug: 'shoes',
    description: 'کفش‌های زنانه و مردانه',
    image: IMG.shoes,
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'اکسسوری',
    slug: 'accessories',
    description: 'جواهرات، عینک و جزئیات تکمیل‌کننده',
    image: IMG.accessories,
    sortOrder: 5,
    isActive: true,
  },
] as const;

interface SeedProduct {
  name: string;
  slug: string;
  sku: string;
  categorySlug: string;
  productKind: ProductKind;
  shortDescription?: string;
  description: string;
  price: number;
  salePrice?: number;
  images: Array<{ url: string; alt: string; isPrimary?: boolean; sortOrder?: number }>;
  colors: Array<{ name: string; hex: string }>;
  sizes: string[];
  stock: number;
  status: 'draft' | 'active' | 'archived';
  featured?: boolean;
  badge?: string;
  tags?: string[];
  material?: string;
  brand?: string;
}

const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: 'گردنبند مروارید کلاسیک',
    slug: 'classic-pearl-necklace',
    sku: 'LX-ACC-001',
    categorySlug: 'accessories',
    productKind: 'accessory',
    description: 'گردنبند مروارید با قفل طلایی و طراحی مینیمال.',
    price: 3290000,
    salePrice: 2890000,
    images: [{ url: IMG.accessories, alt: 'گردنبند مروارید کلاسیک', isPrimary: true }],
    colors: [{ name: 'سفید مرواریدی', hex: '#F5F0E8' }],
    sizes: ['فری‌سایز'],
    stock: 18,
    status: 'active',
    featured: true,
    badge: 'تخفیف',
    tags: ['jewelry'],
  },
  {
    name: 'کیف دستی چرم لونا',
    slug: 'luna-leather-handbag',
    sku: 'LX-BAG-012',
    categorySlug: 'bags',
    productKind: 'bag',
    description: 'کیف دستی چرم با جزئیات طلایی و فضای داخلی منظم.',
    price: 4590000,
    images: [
      { url: IMG.bags, alt: 'کیف دستی چرم لونا', isPrimary: true, sortOrder: 0 },
      { url: IMG.accessories, alt: 'جزئیات کیف لونا', sortOrder: 1 },
    ],
    colors: [
      { name: 'مشکی', hex: '#1A1A1A' },
      { name: 'قهوه‌ای', hex: '#6B4F3A' },
    ],
    sizes: ['فری‌سایز'],
    stock: 9,
    status: 'active',
    featured: true,
    badge: 'جدید',
    material: 'چرم',
  },
  {
    name: 'کفش پاشنه‌دار الیز',
    slug: 'elise-heel-pumps',
    sku: 'LX-SHOE-008',
    categorySlug: 'shoes',
    productKind: 'shoes',
    description: 'کفش پاشنه‌دار با نوک ظریف و پاشنه متوسط.',
    price: 3690000,
    salePrice: 3190000,
    images: [{ url: IMG.shoes, alt: 'کفش پاشنه‌دار الیز', isPrimary: true }],
    colors: [
      { name: 'مشکی', hex: '#171717' },
      { name: 'بژ', hex: '#D8C9B4' },
    ],
    sizes: ['36', '37', '38', '39', '40'],
    stock: 4,
    status: 'active',
    badge: 'تخفیف',
  },
  {
    name: 'بلوز حریر',
    slug: 'silk-blend-blouse',
    sku: 'LX-WOM-003',
    categorySlug: 'women',
    productKind: 'top',
    description: 'بلوزی ظریف با فرم مینیمال و پارچه سبک.',
    price: 1290000,
    images: [{ url: IMG.silkBlouse, alt: 'بلوز حریر', isPrimary: true }],
    colors: [
      { name: 'مشکی', hex: '#171717' },
      { name: 'بژ', hex: '#D8C9B4' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 26,
    status: 'active',
    featured: true,
    material: 'حریر',
  },
  {
    name: 'پالتو پشمی',
    slug: 'tailored-wool-coat',
    sku: 'LX-WOM-007',
    categorySlug: 'women',
    productKind: 'outerwear',
    description: 'پالتوی پشمی با برش Tailored و سیلوئت تمیز.',
    price: 4290000,
    salePrice: 3490000,
    images: [
      { url: IMG.woolCoat, alt: 'پالتو پشمی', isPrimary: true, sortOrder: 0 },
      { url: IMG.women, alt: 'پالتو پشمی — نمای کامل', sortOrder: 1 },
    ],
    colors: [
      { name: 'مشکی', hex: '#181818' },
      { name: 'خاکستری', hex: '#777875' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 7,
    status: 'active',
    badge: 'تخفیف',
    material: 'پشم',
  },
  {
    name: 'شلوار لینن',
    slug: 'linen-trousers',
    sku: 'LX-MEN-004',
    categorySlug: 'men',
    productKind: 'bottom',
    description: 'شلوار لینن با فرم آزاد و رنگ خنثی.',
    price: 890000,
    images: [{ url: IMG.linenTrousers, alt: 'شلوار لینن', isPrimary: true }],
    colors: [
      { name: 'کرم', hex: '#EBE5DB' },
      { name: 'خاکی', hex: '#C2B280' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 31,
    status: 'active',
    material: 'لینن',
  },
  {
    name: 'پلیور کشمیر',
    slug: 'cashmere-sweater',
    sku: 'LX-WOM-011',
    categorySlug: 'women',
    productKind: 'top',
    description: 'پلیور کشمیر نرم با بافت ظریف.',
    price: 1890000,
    images: [{ url: IMG.cashmereSweater, alt: 'پلیور کشمیر', isPrimary: true }],
    colors: [
      { name: 'کرم', hex: '#F1EFEA' },
      { name: 'خاکستری', hex: '#9CA3AF' },
    ],
    sizes: ['S', 'M', 'L'],
    stock: 2,
    status: 'active',
    featured: true,
    badge: 'جدید',
    material: 'کشمیر',
  },
  {
    name: 'دامن پیلیسه',
    slug: 'pleated-midi-skirt',
    sku: 'LX-WOM-015',
    categorySlug: 'women',
    productKind: 'bottom',
    description: 'دامن پیلیسه با حرکت طبیعی پارچه.',
    price: 1590000,
    images: [{ url: IMG.pleatedSkirt, alt: 'دامن پیلیسه', isPrimary: true }],
    colors: [
      { name: 'مشکی', hex: '#1A1A1A' },
      { name: 'سرمه‌ای', hex: '#1E293B' },
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    stock: 11,
    status: 'active',
  },
  {
    name: 'پیراهن سفید کلاسیک',
    slug: 'classic-white-shirt',
    sku: 'LX-MEN-002',
    categorySlug: 'men',
    productKind: 'top',
    description: 'پیراهن سفید کلاسیک با دوخت تمیز.',
    price: 990000,
    salePrice: 790000,
    images: [{ url: IMG.classicShirt, alt: 'پیراهن سفید کلاسیک', isPrimary: true }],
    colors: [{ name: 'سفید', hex: '#FFFFFF' }],
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 19,
    status: 'draft',
    badge: 'تخفیف',
  },
  {
    name: 'کالکشن آرشیو — نمونه',
    slug: 'archived-sample-scarf',
    sku: 'LX-ACC-999',
    categorySlug: 'accessories',
    productKind: 'accessory',
    description: 'نمونه محصول آرشیو شده برای تست کاتالوگ.',
    price: 500000,
    images: [{ url: IMG.accessories, alt: 'نمونه آرشیو', isPrimary: true }],
    colors: [{ name: 'کرم', hex: '#E8DFD0' }],
    sizes: ['فری‌سایز'],
    stock: 0,
    status: 'archived',
  },
];

export async function seedCatalog(): Promise<{
  categories: number;
  products: number;
  demoUser: boolean;
}> {
  const categoryIds = new Map<string, string>();

  for (const item of SEED_CATEGORIES) {
    const category = await Category.findOneAndUpdate(
      { slug: item.slug },
      { $set: { ...item } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    categoryIds.set(item.slug, String(category!._id));
  }

  for (const item of SEED_PRODUCTS) {
    const categoryId = categoryIds.get(item.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category for slug ${item.categorySlug}`);
    }

    await Product.findOneAndUpdate(
      { sku: item.sku },
      {
        $set: {
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          shortDescription: item.shortDescription,
          description: item.description,
          category: categoryId,
          productKind: item.productKind,
          price: item.price,
          salePrice: item.salePrice,
          currency: 'تومان',
          images: item.images.map((image, index) => ({
            url: image.url,
            alt: image.alt,
            isPrimary: image.isPrimary ?? index === 0,
            sortOrder: image.sortOrder ?? index,
          })),
          colors: item.colors,
          sizes: item.sizes,
          stock: item.stock,
          lowStockThreshold: 5,
          status: item.status,
          featured: item.featured ?? false,
          badge: item.badge,
          tags: item.tags ?? [],
          material: item.material,
          brand: item.brand ?? 'Luxora',
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  }

  // Demo storefront customer — matches frontend DEMO_CUSTOMER credentials.
  const demoPasswordHash = await hashPassword('demo1234');
  await User.findOneAndUpdate(
    { phone: '09121234567' },
    {
      $set: {
        firstName: 'سارا',
        lastName: 'محمدی',
        phone: '09121234567',
        email: 'customer@luxora.ir',
        passwordHash: demoPasswordHash,
        role: 'customer',
        isActive: true,
      },
      $setOnInsert: {
        addresses: [],
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  return {
    categories: SEED_CATEGORIES.length,
    products: SEED_PRODUCTS.length,
    demoUser: true,
  };
}

async function main(): Promise<void> {
  await connectDB(env.MONGODB_URI);
  const result = await seedCatalog();
  logger.info('seed.complete', result);
  await disconnectDB();
}

const isDirectRun =
  process.argv[1]?.includes('seedCatalog') ||
  process.argv[1]?.includes('seed');

if (isDirectRun) {
  main().catch((error) => {
    logger.error('seed.failed', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
