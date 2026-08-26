export interface AdminShippingMethod {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

export interface AdminSettings {
  storeName: string;
  logoUrl?: string;

  phone: string;
  email: string;
  address: string;
  hours?: string;

  instagram?: string;
  telegram?: string;

  currency: string;

  shippingMethods: AdminShippingMethod[];

  freeShippingThreshold?: number;

  onlinePaymentEnabled: boolean;
  codEnabled: boolean;

  lowStockThreshold: number;
}
