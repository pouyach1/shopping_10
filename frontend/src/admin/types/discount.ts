export type DiscountType = 'percentage' | 'fixed';

export interface AdminDiscount {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  minOrderAmount?: number;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
}
