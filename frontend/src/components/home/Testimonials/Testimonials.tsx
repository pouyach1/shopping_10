import { useEffect, useRef, useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import type { Testimonial } from '../../../pages/Home/types';
import styles from './Testimonials.module.css';

interface TestimonialsProps {
  title: string;
  testimonials: Testimonial[];
}

const DISPLAY_DURATION = 5000;
const TRANSITION_DURATION = 900;

export function Testimonials({ title, testimonials }: TestimonialsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartYRef = useRef(0);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0].isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || isPaused) return;

    timeoutRef.current = setTimeout(() => {
      goNext();
    }, DISPLAY_DURATION);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeIndex, isPaused, isVisible, goNext]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    if (deltaY > 60) {
      goPrev();
    } else if (deltaY < -60) {
      goNext();
    }
    setIsPaused(false);
  };

  return (
    <section
      ref={sectionRef}
      className={styles.testimonials}
      aria-label={title}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <h2 className={styles.title}>{title}</h2>

      <div className={styles.viewport}>
        {testimonials.map((testimonial, index) => (
          <div
            key={testimonial.id}
            className={`${styles.card} ${index === activeIndex ? styles.active : ''}`}
            style={{
              transform: `translateY(${(index - activeIndex) * 100}%)`,
              opacity: index === activeIndex ? 1 : 0,
              transition: `transform ${TRANSITION_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${TRANSITION_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            }}
          >
            <div className={styles.rating} role="img" aria-label={`${testimonial.rating} از ۵ ستاره`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={14}
                  strokeWidth={1.5}
                  className={`${styles.star} ${i < testimonial.rating ? styles.starFilled : ''}`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <blockquote className={styles.quote}>
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>
            <div className={styles.authorGroup}>
              <span className={styles.author}>{testimonial.author}</span>
              {testimonial.role && (
                <span className={styles.role}>{testimonial.role}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.indicators} aria-hidden="true">
        {testimonials.map((_, index) => (
          <button
            key={index}
            type="button"
            className={`${styles.dot} ${index === activeIndex ? styles.dotActive : ''}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`مشاهده نظر ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
