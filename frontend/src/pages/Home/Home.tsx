import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Hero } from '../../components/home/Hero';
import { FeatureBar } from '../../components/home/FeatureBar';
import { Categories } from '../../components/home/Categories';
import { EditorialBreak } from '../../components/home/EditorialBreak';
import { BestSellers } from '../../components/home/BestSellers';
import { PromoBanner } from '../../components/home/PromoBanner';
import { CustomerFavorites } from '../../components/home/CustomerFavorites';
import { Testimonials } from '../../components/home/Testimonials';
import { InstagramFeed } from '../../components/home/InstagramFeed';
import {
  navItems,
  featureItems,
  categories,
  bestSellerProducts,
  customerFavoriteProducts,
  testimonials,
  socialImages,
  heroContent,
  promoBannerContent,
  footerColumns,
} from './data';
import styles from './Home.module.css';

export function Home() {
  return (
    <div className={styles.home}>
      <a href="#main-content" className="skip-link">
        رد شدن به محتوای اصلی
      </a>
      <Header navItems={navItems} />
      <main id="main-content">
        <Hero
          imageSrc={heroContent.imageSrc}
          imageAlt={heroContent.imageAlt}
        />
        <FeatureBar features={featureItems} />
        <Categories
          title="EXPLORE OUR WORLD"
          description="Curated collections for every style"
          categories={categories}
        />
        <EditorialBreak />
        <BestSellers
          title="پرفروش‌ترین‌های این هفته"
          description="محبوب‌ترین انتخاب‌های مشتریان ما"
          products={bestSellerProducts}
        />
        <PromoBanner
          eyebrow={promoBannerContent.eyebrow}
          title={promoBannerContent.title}
          cta={promoBannerContent.cta}
          imageSrc={promoBannerContent.imageSrc}
          imageAlt={promoBannerContent.imageAlt}
        />
        <section className={styles.favoritesTestimonials} aria-label="محبوب‌ترین‌ها و نظرات مشتریان">
          <div className={styles.favoritesTestimonialsInner}>
            <CustomerFavorites
              title="محبوب‌ترین‌ها"
              products={customerFavoriteProducts}
            />
            <Testimonials
              title="مشتریان ما چه می‌گویند"
              testimonials={testimonials}
            />
          </div>
        </section>
        <InstagramFeed
          title="استایل ما را دنبال کنید"
          handle="@luxora"
          images={socialImages}
        />
      </main>
      <Footer
        brandName="لوکسورا"
        brandTagline="استایل بی‌زمان، کیفیت برتر. ساخته‌شده برای بانوی مدرن."
        columns={footerColumns}
      />
    </div>
  );
}
