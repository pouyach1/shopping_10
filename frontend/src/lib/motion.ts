/** Shared motion helpers for the Luxora storefront. */

export const MOTION = {
  easeOutExpo: [0.22, 1, 0.36, 1] as const,
  microMs: 180,
  standardMs: 280,
  editorialMs: 560,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
