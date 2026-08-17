export interface CustomerData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  province: string;
  city: string;
  postalCode: string;
  address: string;
  landline: string;
  description: string;
}

export type ShippingMethodId =
  | 'post-express'
  | 'tipax'
  | 'post-regular'
  | 'express';

export type PaymentMethodId =
  | 'zarinpal'
  | 'cash-on-delivery';

export interface ShippingMethodOption {
  id: ShippingMethodId;
  title: string;
  description: string;
  price: number;
}

export interface PaymentMethodOption {
  id: PaymentMethodId;
  title: string;
  description: string;
}

export const SHIPPING_METHODS: ShippingMethodOption[] = [
  {
    id: 'post-express',
    title: 'پست پیشتاز',
    description: 'تحویل تقریبی ۲ تا ۵ روز کاری',
    price: 65000,
  },
  {
    id: 'tipax',
    title: 'تیپاکس',
    description: 'تحویل تقریبی ۲ تا ۴ روز کاری',
    price: 85000,
  },
  {
    id: 'post-regular',
    title: 'پست سفارشی',
    description: 'تحویل تقریبی ۴ تا ۷ روز کاری',
    price: 45000,
  },
  {
    id: 'express',
    title: 'ارسال سریع',
    description: 'تحویل تقریبی ۱ تا ۲ روز کاری',
    price: 120000,
  },
];

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'zarinpal',
    title: 'پرداخت آنلاین',
    description: 'پرداخت امن از طریق درگاه زرین‌پال',
  },
  {
    id: 'cash-on-delivery',
    title: 'پرداخت در محل',
    description: 'در صورت پشتیبانی روش ارسال انتخاب‌شده',
  },
];

export const EMPTY_CUSTOMER: CustomerData = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  province: '',
  city: '',
  postalCode: '',
  address: '',
  landline: '',
  description: '',
};