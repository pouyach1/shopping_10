import type { AdminProduct } from './product';
import type { AdminOrder } from './order';

export interface SalesTrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface DashboardStats {
  todaySales: number;
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  productCount: number;
  customerCount: number;
  lowStockCount: number;
}

export interface BestSellingProduct {
  product: AdminProduct;
  quantitySold: number;
  revenue: number;
}

export type RecentOrder = AdminOrder;
