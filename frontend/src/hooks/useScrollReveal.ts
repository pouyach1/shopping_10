import { useCallback, useEffect, useState } from 'react';

interface ScrollRevealOptions {
  threshold?: number;
}

export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  options: ScrollRevealOptions = {},
) {
  const [element, setElement] = useState<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const threshold = options.threshold ?? 0.1;

  const ref = useCallback((node: T | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element || isVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, threshold, isVisible]);

  return {
    ref,
    isVisible,
  };
}
