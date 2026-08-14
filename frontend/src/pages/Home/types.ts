export interface NavItem {
  id: string;
  label: string;
  href: string;
  active?: boolean;
}

export interface FeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: string;
  imageSrc: string;
  imageAlt: string;
  badge?: string;
  href: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role?: string;
  rating: number;
  avatarSrc?: string;
}

export interface SocialImage {
  id: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
}

export interface FooterLink {
  id: string;
  label: string;
  href: string;
}

export interface FooterColumn {
  id: string;
  title: string;
  links: FooterLink[];
}

export interface CtaButton {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  href?: string;
}
