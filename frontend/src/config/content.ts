/**
 * LUXORA CONTENT CONFIG
 *
 * تمام محتوای قابل تغییر صفحه اصلی را اینجا نگه می‌داریم.
 * برای تغییر عکس‌ها، فقط مسیرهای همین فایل را تغییر بده.
 */

export const homeContent = {
  hero: {
    eyebrow: 'SPRING / SUMMER 2026',
    title: 'ELEGANCE,\\nREIMAGINED',
    description: 'Timeless silhouettes. Modern craftsmanship.\\nDesigned for the now and forever.',
    primaryCta: {
      label: 'SHOP THE COLLECTION',
      href: '/shop',
    },
    secondaryCta: {
      label: 'LOOKBOOK',
      href: '/lookbook',
    },
  },

  categories: {
    title: 'EXPLORE OUR WORLD',
    description: 'Curated collections for every style',
  },

  bestSellers: {
    title: 'پرفروش‌ترین‌های این هفته',
    description: 'محبوب‌ترین انتخاب‌های مشتریان ما',
  },

  favorites: {
    title: 'محبوب‌ترین‌ها',
  },

  testimonials: {
    title: 'مشتریان ما چه می‌گویند',
  },

  instagram: {
    title: 'استایل ما را دنبال کنید',
    handle: '@luxora',
  },

  promo: {
    title: 'استایل خود را دوباره تعریف کنید',
  },
} as const;
