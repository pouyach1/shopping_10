import { useScrollReveal } from '../../../hooks/useScrollReveal';
import { Star } from 'lucide-react';
import type { Testimonial } from '../../../pages/Home/types';
import styles from './Testimonials.module.css';

interface TestimonialsProps {
  title: string;
  testimonials: Testimonial[];
}

export function Testimonials({ title, testimonials }: TestimonialsProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      className={`${styles.testimonials} ${isVisible ? styles.visible : ''}`}
      aria-label={title}
    >
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.list}>
        {testimonials.map((testimonial, index) => (
          <div
            key={testimonial.id}
            className={styles.testimonial}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <div className={styles.rating} role="img" aria-label={`${testimonial.rating} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={16}
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
    </section>
  );
}
