import { useEffect, useRef, useState } from 'react';
import type { Product } from '../../../types/product';
import { formatPrice } from '../../../lib/formatCurrency';
import styles from './CustomerFavorites.module.css';

interface CustomerFavoritesProps {
  title: string;
  products: Product[];
}

const SPEED = 35;
const DUPLICATE_COUNT = 2;

export function CustomerFavorites({ title, products }: CustomerFavoritesProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const rafRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const lastTimeRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);
  const isPausedRef = useRef(false);
  const animateRef = useRef<((timestamp: number) => void) | null>(null);

  const duplicatedProducts = Array.from({ length: DUPLICATE_COUNT }, () => products).flat();

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    prefersReducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tick = (timestamp: number) => {
      const track = trackRef.current;
      if (!track) return;

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (!isPausedRef.current && !prefersReducedMotionRef.current) {
        offsetRef.current += (SPEED * delta) / 1000;
        const cardWidth = track.children[0]?.getBoundingClientRect().width ?? 0;
        const gap = 20;
        const totalItemWidth = cardWidth + gap;

        if (offsetRef.current >= totalItemWidth) {
          offsetRef.current -= totalItemWidth;
        }

        track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    animateRef.current = tick;

    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0].isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (isVisible && animateRef.current) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animateRef.current);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isVisible]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchOffsetRef.current = offsetRef.current;
    isDraggingRef.current = true;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    const track = trackRef.current;
    if (track) {
      track.style.transform = `translate3d(${-touchOffsetRef.current + deltaX}px, 0, 0)`;
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setIsPaused(false);
  };

  return (
    <section
      ref={sectionRef}
      className={`${styles.favorites} ${isVisible ? styles.visible : ''}`}
      aria-label={title}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.heading}>
        <span className={styles.kicker}>LUXORA EDIT</span>
        <h2 className={styles.title}>{title}</h2>
      </div>

      <div className={styles.viewport}>
        <div ref={trackRef} className={styles.track}>
          {duplicatedProducts.map((product, index) => (
            <a
              key={`${product.id}-${index}`}
              href={product.href}
              className={styles.productItem}
              aria-label={product.name}
            >
              <div className={styles.imageWrapper}>
                <img
                  src={product.imageSrc}
                  alt={product.imageAlt}
                  className={styles.image}
                  loading="lazy"
                  draggable={false}
                />
              </div>
              <div className={styles.productInfo} dir="rtl">
                <h3 className={styles.productName}>{product.name}</h3>
                <span className={styles.price}>
                  {formatPrice(product.price)} {product.currency}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
