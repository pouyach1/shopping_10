export interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;

  orderCount: number;
  totalSpent: number;

  createdAt: string;
}
