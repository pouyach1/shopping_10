import { useEffect, useRef, useState, type RefObject } from 'react';

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  root?: HTMLElement | null;
  once?: boolean;
}

interface ScrollRevealResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  isVisible: boolean;
}

/**
 * Hook to observe an element and trigger a reveal animation when it enters the viewport.
 * Returns a ref to attach to the element and a boolean indicating visibility.
 *
 * When IntersectionObserver is not available (e.g., older browsers or SSR),
 * the element is considered visible immediately to avoid broken layouts.
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  options: UseScrollRevealOptions = {}
): ScrollRevealResult<T> {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    root = null,
    once = true,
  } = options;

  const ref = useRef<T | null>(null);

  // Initialize isVisible as true if IntersectionObserver is not available.
  // This avoids calling setState within the effect.
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    if (typeof IntersectionObserver === 'undefined') return true;
    return false;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If IntersectionObserver is unavailable, the element is already visible
    // (handled by useState initializer above).
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
        root,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, root, once]);

  return { ref, isVisible };
}
