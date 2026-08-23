import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  Ruler,
  Search,
  ShoppingBag,
  Truck,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  bestSellerProducts,
  customerFavoriteProducts,
} from '../Home/data';
import type { Product } from '../../types/product';
import type { CartItem } from '../../types/cart';
import { ProductCard } from '../../components/product/ProductCard';
import { siteImages } from '../../config/images';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../lib/formatCurrency';
import styles from './Product.module.css';

interface ProductPageProps {
  slug?: string;
}

type ProductContent = {
  description: string;
  rating: number;
  reviewCount: number;
  colors: {
    name: string;
    value: string;
  }[];
  sizes: string[];
  details: string[];
  materials: string[];
  sizeFit: string[];
  shipping: string[];
};

type ProductDetails = Product & ProductContent;

const productContent: Record<string, ProductContent> = {
  'silk-blend-blouse': {
    description:
      'بلوزی ظریف با فرم مینیمال و پارچه‌ای سبک که برای استایل روزمره و موقعیت‌های رسمی طراحی شده است.',
    rating: 4.8,
    reviewCount: 128,
    colors: [
      { name: 'مشکی', value: '#171717' },
      { name: 'خاکستری', value: '#8A8A86' },
      { name: 'بژ', value: '#D8C9B4' },
      { name: 'طلایی', value: '#B89B5E' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    details: [
      'فرم آزاد و ساختار مینیمال',
      'یقه کلاسیک با دوخت ظریف',
      'مناسب استفاده روزمره و رسمی',
      'طراحی شده برای استایل زنانه مدرن',
      'جزئیات دوخت تمیز و مینیمال',
    ],
    materials: [
      'ترکیب الیاف ابریشم و پارچه نرم',
      'بافت سبک و تنفس‌پذیر',
      'مناسب استفاده در فصل‌های معتدل',
    ],
    sizeFit: [
      'فرم محصول Regular Fit است.',
      'برای انتخاب دقیق‌تر، راهنمای سایز را بررسی کنید.',
    ],
    shipping: [
      'ارسال به سراسر کشور',
      'امکان بازگشت طبق قوانین فروشگاه',
      'بسته‌بندی اختصاصی LUXORA',
    ],
  },

  'tailored-wool-coat': {
    description:
      'پالتوی پشمی با ساختار Tailored و سیلوئت تمیز که برای ساختن یک استایل ماندگار طراحی شده است.',
    rating: 4.9,
    reviewCount: 96,
    colors: [
      { name: 'مشکی', value: '#181818' },
      { name: 'خاکستری', value: '#777875' },
      { name: 'بژ', value: '#C9B9A1' },
      { name: 'طلایی', value: '#B89B5E' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    details: [
      'برش Tailored',
      'یقه ساختاریافته',
      'فرم مناسب استفاده شهری',
      'طراحی مینیمال و ماندگار',
      'پرداخت دقیق در جزئیات',
    ],
    materials: [
      'پارچه پشمی با کیفیت بالا',
      'بافت گرم و نرم',
      'آستر داخلی لطیف',
    ],
    sizeFit: [
      'فرم محصول Tailored Fit است.',
      'در صورت قرار گرفتن بین دو سایز، سایز بزرگ‌تر پیشنهاد می‌شود.',
    ],
    shipping: [
      'ارسال به سراسر کشور',
      'بسته‌بندی محافظ اختصاصی',
      'امکان بازگشت طبق قوانین فروشگاه',
    ],
  },
};

const defaultContent: ProductContent = {
  description:
    'یک انتخاب مینیمال و لوکس از مجموعه LUXORA با تمرکز بر کیفیت، فرم و جزئیات.',
  rating: 4.8,
  reviewCount: 64,
  colors: [
    { name: 'مشکی', value: '#171717' },
    { name: 'خاکستری', value: '#8A8A86' },
    { name: 'بژ', value: '#D8C9B4' },
    { name: 'طلایی', value: '#B89B5E' },
  ],
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  details: [
    'طراحی مینیمال LUXORA',
    'ساختار تمیز و کاربردی',
    'جزئیات ظریف و دقیق',
    'مناسب استفاده روزمره',
    'تولید با تمرکز بر کیفیت',
  ],
  materials: [
    'پارچه با کیفیت بالا',
    'بافت نرم و راحت',
    'پرداخت ظریف سطح پارچه',
  ],
  sizeFit: [
    'فرم محصول استاندارد است.',
    'برای انتخاب دقیق‌تر راهنمای سایز را بررسی کنید.',
  ],
  shipping: [
    'ارسال به سراسر کشور',
    'بسته‌بندی اختصاصی LUXORA',
    'امکان بازگشت طبق قوانین فروشگاه',
  ],
};

const getDiscountPercent = (product: Product) => {
  if (!product.originalPrice || product.originalPrice <= product.price) {
    return 0;
  }

  return Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100,
  );
};

const productsBySlug: Record<string, Product> = {};
for (const item of [...customerFavoriteProducts, ...bestSellerProducts]) {
  const productSlug = item.href.split('/').pop();
  if (productSlug) {
    productsBySlug[productSlug] = item;
  }
}

function getProductDetails(slug: string | undefined): ProductDetails | null {
  if (!slug) return null;

  const base = productsBySlug[slug];
  if (!base) return null;

  return { ...base, ...(productContent[slug] ?? defaultContent) };
}

function ProductNotFound() {
  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.container}>
        <div className={styles.notFound}>
          <span className={styles.notFoundEyebrow}>LUXORA</span>
          <h1>محصول پیدا نشد</h1>
          <p>
            متأسفیم، محصولی که دنبال آن هستید وجود ندارد یا از فروشگاه حذف شده
            است.
          </p>
          <a href="/" className={styles.notFoundLink}>
            بازگشت به صفحه اصلی
          </a>
        </div>
      </div>
    </main>
  );
}

export function Product({ slug }: ProductPageProps) {
  const product = getProductDetails(slug);

  if (!product) {
    return <ProductNotFound />;
  }

  return <ProductView product={product} />;
}

function ProductView({ product }: { product: ProductDetails }) {
  const { addItem } = useCart();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState(product.sizes[1]);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const handleAddToCart = () => {
    const variantKey = `${product.id}__${selectedColor.name}__${selectedSize}`;

    const newItem: CartItem = {
      id: variantKey,
      productId: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      size: selectedSize,
      color: selectedColor.name,
      colorValue: selectedColor.value,
      imageSrc: product.imageSrc,
      imageAlt: product.imageAlt,
      quantity,
    };

    addItem(newItem);
    alert('محصول به سبد خرید اضافه شد');
  };

  const gallery = useMemo(
    () => [
      product.imageSrc,
      product.imageSrc,
      product.imageSrc,
      product.imageSrc,
    ],
    [product.imageSrc],
  );

  const relatedProducts = useMemo(() => {
    const products = [
      ...bestSellerProducts,
      ...customerFavoriteProducts,
    ];

    const unique = products.filter(
      (item, index, array) =>
        array.findIndex((candidate) => candidate.id === item.id) === index &&
        item.id !== product.id,
    );

    return unique.slice(0, 4);
  }, [product.id]);

  const discount = getDiscountPercent(product);

  const activeTabItems = {
    details: product.details,
    materials: product.materials,
    sizeFit: product.sizeFit,
    shipping: product.shipping,
  }[activeTab as 'details' | 'materials' | 'sizeFit' | 'shipping'];

  const previousImage = () => {
    setSelectedImage((current) =>
      current === 0 ? gallery.length - 1 : current - 1,
    );
  };

  const nextImage = () => {
    setSelectedImage((current) =>
      current === gallery.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <a href="/">خانه</a>
          <ChevronLeft size={14} />
          <a href="/shop">فروشگاه</a>
          <ChevronLeft size={14} />
          <span>{product.name}</span>
        </div>

        <section className={styles.productLayout}>
          <div className={styles.gallery}>
            <div className={styles.thumbnailColumn}>
              {gallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={`${styles.thumbnail} ${
                    selectedImage === index ? styles.thumbnailActive : ''
                  }`}
                  onClick={() => setSelectedImage(index)}
                  aria-label={`تصویر ${index + 1} از ${product.name}`}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>

            <div className={styles.mainImageWrapper}>
              <img
                src={gallery[selectedImage]}
                alt={product.imageAlt}
                className={styles.mainImage}
              />

              {product.badge && (
                <span className={styles.imageBadge}>{product.badge}</span>
              )}

              <button
                type="button"
                className={styles.zoomButton}
                aria-label="بزرگ‌نمایی تصویر"
                onClick={() => setIsZoomOpen(true)}
              >
                <Search size={18} strokeWidth={1.7} />
              </button>

              <div className={styles.galleryNavigation}>
                <button
                  type="button"
                  onClick={previousImage}
                  aria-label="تصویر قبلی"
                >
                  <ChevronRight size={18} />
                </button>

                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="تصویر بعدی"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className={styles.productInfo}>
            <div className={styles.eyebrow}>
              <span>NEW ARRIVAL</span>
            </div>

            <div className={styles.titleRow}>
              <h1>{product.name}</h1>

              <button
                type="button"
                className={`${styles.wishlist} ${
                  isWishlisted ? styles.wishlistActive : ''
                }`}
                onClick={() => setIsWishlisted((current) => !current)}
                aria-label={
                  isWishlisted
                    ? 'حذف از علاقه‌مندی‌ها'
                    : 'افزودن به علاقه‌مندی‌ها'
                }
                aria-pressed={isWishlisted}
              >
                <Heart
                  size={21}
                  strokeWidth={1.6}
                  fill={isWishlisted ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            <div className={styles.rating}>
              <span className={styles.stars}>★★★★★</span>
              <span>
                {product.rating} ({product.reviewCount} نظر)
              </span>
            </div>

            <div className={styles.priceArea}>
              <div className={styles.currentPrice}>
                {formatPrice(product.price)}
                <small>{product.currency}</small>
              </div>

              {product.originalPrice && (
                <div className={styles.oldPrice}>
                  {formatPrice(product.originalPrice)} {product.currency}
                </div>
              )}

              {discount > 0 && (
                <span className={styles.discount}>
                  {discount}% تخفیف
                </span>
              )}
            </div>

            <p className={styles.description}>
              {product.description}
            </p>

            <div className={styles.divider} />

            <section className={styles.selector}>
              <div className={styles.selectorHeader}>
                <div>
                  <span className={styles.selectorLabel}>رنگ</span>
                  <strong>{selectedColor.name}</strong>
                </div>
              </div>

              <div className={styles.colorOptions}>
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    className={`${styles.colorOption} ${
                      selectedColor.name === color.name
                        ? styles.colorSelected
                        : ''
                    }`}
                    onClick={() => setSelectedColor(color)}
                    aria-label={color.name}
                    aria-pressed={selectedColor.name === color.name}
                  >
                    <span style={{ backgroundColor: color.value }} />
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.selector}>
              <div className={styles.selectorHeader}>
                <span className={styles.selectorLabel}>سایز</span>

                <button type="button" className={styles.sizeGuide}>
                  <Ruler size={15} />
                  راهنمای سایز
                </button>
              </div>

              <div className={styles.sizeOptions}>
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`${styles.sizeOption} ${
                      selectedSize === size ? styles.sizeSelected : ''
                    }`}
                    onClick={() => setSelectedSize(size)}
                    aria-pressed={selectedSize === size}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.purchaseArea}>
              <div className={styles.quantity}>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) => Math.max(1, current - 1))
                  }
                  aria-label="کاهش تعداد"
                >
                  <Minus size={15} />
                </button>

                <span>{quantity}</span>

                <button
                  type="button"
                  onClick={() => setQuantity((current) => current + 1)}
                  aria-label="افزایش تعداد"
                >
                  <Plus size={15} />
                </button>
              </div>

              <button
                type="button"
                className={styles.addToCart}
                onClick={handleAddToCart}
              >
                <ShoppingBag size={18} strokeWidth={1.7} />
                افزودن به سبد خرید
              </button>
            </section>

            <div className={styles.serviceGrid}>
              <div className={styles.serviceItem}>
                <Truck size={19} />
                <div>
                  <strong>ارسال سریع</strong>
                  <span>به سراسر کشور</span>
                </div>
              </div>

              <div className={styles.serviceItem}>
                <RotateCcw size={19} />
                <div>
                  <strong>بازگشت آسان</strong>
                  <span>ضمانت ۳۰ روزه</span>
                </div>
              </div>

              <div className={styles.serviceItem}>
                <ShieldCheck size={19} />
                <div>
                  <strong>خرید امن</strong>
                  <span>پرداخت مطمئن</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.detailsSection}>
          <div className={styles.tabs}>
            {[
              ['details', 'جزئیات'],
              ['materials', 'جنس و مواد'],
              ['sizeFit', 'سایز و فیت'],
              ['shipping', 'ارسال و بازگشت'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`${styles.tab} ${
                  activeTab === id ? styles.tabActive : ''
                }`}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.tabContent}>
            <ul>
              {activeTabItems.map((item) => (
                <li key={item}>
                  <span />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.editorialImage}>
          <img
            src={siteImages.banners.promo}
            alt="LUXORA editorial"
            loading="lazy"
          />
          <div>
            <span>LUXORA EDITORIAL</span>
            <h2>جزئیات، تفاوت را می‌سازند.</h2>
          </div>
        </section>

        <section className={styles.relatedSection}>
          <div className={styles.relatedHeader}>
            <div>
              <span>CURATED FOR YOU</span>
              <h2>شاید این‌ها را هم بپسندید</h2>
            </div>

            <a href="/shop">
              مشاهده همه
              <ChevronLeft size={17} />
            </a>
          </div>

          <div className={styles.relatedGrid}>
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      </div>

      <div className={styles.mobileCart}>
        <div>
          <strong>{formatPrice(product.price)}</strong>
          <span>{product.currency}</span>
        </div>

        <button type="button" onClick={handleAddToCart}>
          <ShoppingBag size={18} />
          افزودن به سبد
        </button>
      </div>

      {isZoomOpen && (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="نمایش بزرگ تصویر محصول"
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            type="button"
            className={styles.closeLightbox}
            onClick={() => setIsZoomOpen(false)}
            aria-label="بستن"
          >
            <X size={24} />
          </button>

          <img
            src={gallery[selectedImage]}
            alt={product.imageAlt}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
