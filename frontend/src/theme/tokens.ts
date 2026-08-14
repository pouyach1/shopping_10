/**
 * LUXORA — Centralized Theme Tokens
 * 
 * This file defines the complete design system for the frontend.
 * All components should consume CSS variables generated from these tokens.
 */

export const themeTokens = {
  brand: {
    name: 'LUXORA',
    tagline: 'Timeless style, premium quality',
  },

  colors: {
    primary: '#1A1B1E',
    secondary: '#6B6B6B',
    accent: '#B89B5E',
    accentHover: '#D4AF37',
    background: '#F1EFEA',
    backgroundMuted: '#F5F0E8',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    textPrimary: '#1A1B1E',
    textSecondary: '#6B6B6B',
    textMuted: '#9CA3AF',
    textInverse: '#FFFFFF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    overlay: 'rgba(0, 0, 0, 0.28)',
  },

  fonts: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Inter', 'Vazirmatn', system-ui, sans-serif",
    ui: "'Inter', 'Vazirmatn', system-ui, sans-serif",
  },

  fontSizes: {
    display: 'clamp(2.5rem, 5vw, 4.5rem)',
    heroTitle: 'clamp(2.375rem, 4.5vw, 4rem)',
    h1: 'clamp(2rem, 3vw, 2.75rem)',
    h2: 'clamp(1.5rem, 2.5vw, 2.25rem)',
    h3: 'clamp(1.25rem, 2vw, 1.75rem)',
    h4: 'clamp(1.125rem, 1.5vw, 1.375rem)',
    bodyLarge: '1.0625rem',
    body: '0.9375rem',
    bodySmall: '0.8125rem',
    caption: '0.75rem',
    eyebrow: '0.6875rem',
    button: '0.8125rem',
    navigation: '0.8125rem',
  },

  fontWeights: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeights: {
    tight: 1.05,
    heading: 1.4,
    normal: 1.55,
    relaxed: 1.7,
    body: 1.7,
  },

  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.01em',
    uppercase: '0.08em',
    editorial: '0.18em',
    widest: '0.25em',
  },

  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2.5rem',
    '3xl': '3rem',
    '4xl': '4rem',
    '5xl': '5rem',
    '6xl': '6rem',
  },

  sectionSpacing: {
    mobile: '60px',
    tablet: '80px',
    desktop: '120px',
  },

  container: {
    maxWidth: '1440px',
    paddingMobile: '16px',
    paddingTablet: '32px',
    paddingDesktop: '64px',
    paddingWideDesktop: '48px',
  },

  radius: {
    none: '0',
    small: '0.25rem',
    medium: '0.5rem',
    large: '0.75rem',
    pill: '9999px',
  },

  borders: {
    thin: '1px',
    normal: '2px',
    strong: '3px',
  },

  shadows: {
    none: 'none',
    subtle: '0 1px 2px rgba(0, 0, 0, 0.05)',
    card: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },

  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease',
    editorial: '800ms cubic-bezier(0.22, 1, 0.36, 1)',
  },

  zIndex: {
    base: 1,
    content: 2,
    overlay: 3,
    header: 10,
    modal: 100,
  },

  breakpoints: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
    wide: 1280,
    ultraWide: 1536,
  },

  components: {
    hero: {
      titleSize: 'clamp(2.5rem, 4.5vw, 4.25rem)',
      descriptionSize: '1rem',
      height: '80vh',
      minHeight: '650px',
    },
    productCard: {
      titleSize: '0.8125rem',
      priceSize: '0.8125rem',
      imageRatio: '3 / 4',
      imageRadius: '0',
    },
    button: {
      height: '44px',
      paddingX: '32px',
      paddingY: '14px',
      radius: '0',
      fontSize: '0.8125rem',
      letterSpacing: '0.08em',
    },
    section: {
      titleSize: 'clamp(1.5rem, 2.5vw, 2.25rem)',
      spacingTop: '120px',
      spacingBottom: '140px',
    },
    categories: {
      cardAspectRatio: '4 / 5',
      titleSize: '1.125rem',
      shopNowSize: '0.625rem',
    },
  },
} as const;

export type ThemeTokens = typeof themeTokens;
