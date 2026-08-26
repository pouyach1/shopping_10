import type { ElementType, ReactNode } from 'react';

import { useScrollReveal } from '../../../hooks/useScrollReveal';

import styles from './Reveal.module.css';

type RevealVariant = 'subtle' | 'moderate' | 'editorial';

interface RevealProps {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  /** Stagger direct children that opt into revealChild. */
  stagger?: boolean;
  as?: ElementType;
  rootMargin?: string;
}

export function Reveal({
  children,
  className = '',
  variant = 'moderate',
  stagger = false,
  as: Component = 'div',
  rootMargin,
}: RevealProps) {
  const { ref, isVisible, ready } = useScrollReveal<HTMLElement>({
    rootMargin,
  });

  const classes = [
    styles.reveal,
    styles[variant],
    ready ? styles.ready : '',
    isVisible ? styles.visible : '',
    stagger ? styles.stagger : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component ref={ref} className={classes}>
      {children}
    </Component>
  );
}
