import type { WishlistItem } from '../../types/user';
import { siteImages } from '../../config/images';

export const mockWishlistItems: WishlistItem[] = [
  {
    id: 'wish-1',
    productId: 'prod-1',
    name: 'بلوز حریر',
    price: 1290000,
    currency: 'تومان',
    size: 'M',
    imageSrc: siteImages.products.silkBlouse,
    imageAlt: 'بلوز حریر',
  },
  {
    id: 'wish-2',
    productId: 'prod-2',
    name: 'پالتو پشمی',
    price: 3490000,
    currency: 'تومان',
    size: 'L',
    imageSrc: siteImages.products.woolCoat,
    imageAlt: 'پالتو پشمی',
  },
  {
    id: 'wish-3',
    productId: 'prod-4',
    name: 'پلیور کشمیر',
    price: 1890000,
    currency: 'تومان',
    size: 'M',
    imageSrc: siteImages.products.cashmereSweater,
    imageAlt: 'پلیور کشمیر',
  },
  {
    id: 'wish-4',
    productId: 'prod-5',
    name: 'دامن پیلیسه',
    price: 1590000,
    currency: 'تومان',
    size: 'S',
    imageSrc: siteImages.products.pleatedSkirt,
    imageAlt: 'دامن پیلیسه',
  },
];
