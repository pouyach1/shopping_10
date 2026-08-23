export const LAST_ORDER_STORAGE_KEY = 'luxora-last-order';

export interface OrderSnapshot {
  orderId: string;
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  customerName: string;
  createdAt: string;
}

export function saveOrderSnapshot(snapshot: OrderSnapshot): void {
  try {
    sessionStorage.setItem(
      LAST_ORDER_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
  } catch {
    // Ignore storage failures for presentation flow.
  }
}

export function readOrderSnapshot(): OrderSnapshot | null {
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as Partial<OrderSnapshot>;
    if (
      typeof data.orderId !== 'string' ||
      typeof data.total !== 'number'
    ) {
      return null;
    }

    return {
      orderId: data.orderId,
      itemCount: data.itemCount ?? 0,
      subtotal: data.subtotal ?? 0,
      shipping: data.shipping ?? 0,
      total: data.total,
      customerName: data.customerName ?? '',
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
