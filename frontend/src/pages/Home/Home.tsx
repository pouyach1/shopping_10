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
import { homeContent } from '../../config/content';

export function Home() {
  return (
    <div className={styles.home}>
      <a href="#main-content" className="skip-link">
        رد شدن به محتوای اصلی
      </a>

      <Header
        navItems={navItems}
        logo="لوکسورا"
        logoLatin="LUXORA"
      />

      <main id="main-content">
        <Hero
          imageSrc={heroContent.imageSrc}
          imageAlt={heroContent.imageAlt}
        />

        <FeatureBar features={featureItems} />

        <Categories
          title={homeContent.categories.title}
          description={homeContent.categories.description}
          categories={categories}
        />

        <EditorialBreak />

        <BestSellers
          title={homeContent.bestSellers.title}
          description={homeContent.bestSellers.description}
          products={bestSellerProducts}
        />

        <PromoBanner
          title={homeContent.promo.title}
          imageSrc={promoBannerContent.imageSrc}
          imageAlt={promoBannerContent.imageAlt}
        />

        <section className={styles.favoritesTestimonials}>
          <div className={styles.favoritesTestimonialsInner}>
            <CustomerFavorites
              title={homeContent.favorites.title}
              products={customerFavoriteProducts}
            />

            <Testimonials
              title={homeContent.testimonials.title}
              testimonials={testimonials}
            />
          </div>
        </section>

        <InstagramFeed
          title={homeContent.instagram.title}
          handle={homeContent.instagram.handle}
          images={socialImages}
        />
      </main>

      <Footer
        brandName="لوکسورا"
        brandTagline="زیبایی بی‌زمان، برای لحظه‌های ماندگار."
        columns={footerColumns}
      />
    </div>
  );
}
