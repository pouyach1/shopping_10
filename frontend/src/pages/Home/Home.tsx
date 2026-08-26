import { Hero } from '../../components/home/Hero';
import { TrustStrip } from '../../components/home/TrustStrip';
import { Categories } from '../../components/home/Categories';
import { BestSellers } from '../../components/home/BestSellers';
import { PromoBanner } from '../../components/home/PromoBanner';

import {
  featureItems,
  categories,
  bestSellerProducts,
  heroContent,
  promoBannerContent,
} from './data';

import styles from './Home.module.css';
import { homeContent } from '../../config/content';

/**
 * Home page sections only — Header/Footer/main live in SiteLayout.
 */
export function Home() {
  return (
    <div className={styles.home}>
      <Hero
        eyebrow={heroContent.eyebrow}
        title={heroContent.title}
        description={heroContent.description}
        primaryCta={heroContent.primaryCta}
        imageSrc={heroContent.imageSrc}
        imageAlt={heroContent.imageAlt}
      />

      <TrustStrip features={featureItems} />

      <Categories
        title={homeContent.categories.title}
        description={homeContent.categories.description}
        categories={categories}
      />

      <BestSellers
        title={homeContent.bestSellers.title}
        description={homeContent.bestSellers.description}
        products={bestSellerProducts}
      />

      <PromoBanner
        title={promoBannerContent.title}
        description={promoBannerContent.description}
        ctaLabel={promoBannerContent.ctaLabel}
        ctaHref={promoBannerContent.ctaHref}
        imageSrc={promoBannerContent.imageSrc}
        imageAlt={promoBannerContent.imageAlt}
      />
    </div>
  );
}
