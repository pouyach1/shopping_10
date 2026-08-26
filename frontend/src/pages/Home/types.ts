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
  href?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  imageSrc: string;
  imageAlt: string;
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

export type CategoryId =
  | 'women'
  | 'men'
  | 'bags'
  | 'shoes'
  | 'accessories';

export type CategoryBannerType =
  | 'image'
  | 'video'
  | 'editorial'
  | 'quote';

export interface CategoryBannerItem {
  id: string;
  category: CategoryId;
  type: CategoryBannerType;
  src: string;
  poster?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  objectPosition?: string;
}

export interface CategoryBannerProps {
  category: CategoryId;
  banners?: CategoryBannerItem[];
}
