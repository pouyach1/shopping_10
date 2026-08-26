import { useCallback, useLayoutEffect, useState } from 'react';

import { prefersReducedMotion } from '../lib/motion';

interface ScrollRevealOptions {
  threshold?: number;
  /** CSS margin for IntersectionObserver — expand early reveal. */
  rootMargin?: string;
}

/**
 * One-shot viewport reveal. Content stays visible until JS measures;
 * below-fold elements hide before paint, then reveal on intersect.
 * Respects prefers-reduced-motion (always visible, no observer).
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  options: ScrollRevealOptions = {},
) {
  const [element, setElement] = useState<T | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [ready, setReady] = useState(false);

  const threshold = options.threshold ?? 0.12;
  const rootMargin = options.rootMargin ?? '0px 0px -6% 0px';

  const ref = useCallback((node: T | null) => {
    setElement(node);
  }, []);

  useLayoutEffect(() => {
    if (!element) return;

    if (prefersReducedMotion()) {
      setIsVisible(true);
      setReady(false);
      return;
    }

    const rect = element.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const alreadyInView = rect.top < vh * 0.92 && rect.bottom > 32;

    setIsVisible(alreadyInView);
    setReady(true);

    if (alreadyInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, threshold, rootMargin]);

  return {
    ref,
    isVisible,
    ready,
  };
}
