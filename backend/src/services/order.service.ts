import { Order, type OrderDocument } from '../models/Order';
import {
  parseOrThrow,
  orderListQuerySchema,
  orderNumberParamSchema,
  adminOrderStatusSchema,
  cancelOrderSchema,
} from '../validators/order.validators';
import { notFound } from '../utils/AppError';
import { logger } from '../utils/logger';
import { restoreMany } from './inventory.service';
import { toPublicOrder, type PublicOrder } from './order.mapper';
import {
  assertCustomerCancellable,
  assertTransition,
  nextFulfillmentForOrderStatus,
} from './orderTransitions';

export interface OrderListResult {
  items: PublicOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function findOwnedOrder(
  orderNumber: string,
  userId: string,
): Promise<OrderDocument> {
  const order = await Order.findOne({ orderNumber, user: userId });
  if (!order) throw notFound('سفارش یافت نشد.', 'ORDER_NOT_FOUND');
  return order;
}

export async function listCustomerOrders(
  userId: string,
  rawQuery: unknown,
): Promise<OrderListResult> {
  const query = parseOrThrow(orderListQuerySchema, rawQuery);
  const filter: Record<string, unknown> = { user: userId };
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;
  const [total, docs] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
  ]);

  return {
    items: docs.map(toPublicOrder),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
}

export async function getCustomerOrder(
  userId: string,
  orderNumberRaw: string,
): Promise<PublicOrder> {
  const { orderNumber } = parseOrThrow(orderNumberParamSchema, {
    orderNumber: orderNumberRaw,
  });
  const order = await findOwnedOrder(orderNumber, userId);
  return toPublicOrder(order);
}

export async function cancelCustomerOrder(
  userId: string,
  orderNumberRaw: string,
  rawBody: unknown,
): Promise<PublicOrder> {
  const { orderNumber } = parseOrThrow(orderNumberParamSchema, {
    orderNumber: orderNumberRaw,
  });
  const body = parseOrThrow(cancelOrderSchema, rawBody ?? {});
  const order = await findOwnedOrder(orderNumber, userId);

  assertCustomerCancellable(order.status);
  assertTransition(order.status, 'cancelled');

  const previous = order.status;
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.history.push({
    fromStatus: previous,
    toStatus: 'cancelled',
    actorType: 'customer',
    actorId: userId,
    reason: body.reason || 'لغو توسط مشتری',
    at: new Date(),
  });

  if (order.inventoryDecremented) {
    await restoreMany(
      order.items.map((item) => ({
        productId: String(item.productId),
        quantity: item.quantity,
      })),
    );
    order.inventoryDecremented = false;
  }

  await order.save();
  logger.info('order.cancelled', {
    orderNumber: order.orderNumber,
    userId,
    actor: 'customer',
  });
  return toPublicOrder(order);
}

export async function listAdminOrders(rawQuery: unknown): Promise<OrderListResult> {
  const query = parseOrThrow(orderListQuerySchema, rawQuery);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;
  const [total, docs] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
  ]);

  return {
    items: docs.map(toPublicOrder),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
}

export async function getAdminOrder(orderNumberRaw: string): Promise<PublicOrder> {
  const { orderNumber } = parseOrThrow(orderNumberParamSchema, {
    orderNumber: orderNumberRaw,
  });
  const order = await Order.findOne({ orderNumber });
  if (!order) throw notFound('سفارش یافت نشد.', 'ORDER_NOT_FOUND');
  return toPublicOrder(order);
}

export async function updateAdminOrderStatus(
  orderNumberRaw: string,
  rawBody: unknown,
  adminId: string,
): Promise<PublicOrder> {
  const { orderNumber } = parseOrThrow(orderNumberParamSchema, {
    orderNumber: orderNumberRaw,
  });
  const body = parseOrThrow(adminOrderStatusSchema, rawBody);
  const order = await Order.findOne({ orderNumber });
  if (!order) throw notFound('سفارش یافت نشد.', 'ORDER_NOT_FOUND');

  assertTransition(order.status, body.status);

  const previous = order.status;
  if (previous === body.status) {
    return toPublicOrder(order);
  }

  order.status = body.status;
  const fulfillment = nextFulfillmentForOrderStatus(body.status);
  if (fulfillment) order.fulfillmentStatus = fulfillment;

  if (body.status === 'paid') {
    order.paymentStatus = 'paid';
    order.paidAt = new Date();
  }
  if (body.status === 'cancelled' || body.status === 'failed') {
    order.cancelledAt = new Date();
    if (order.inventoryDecremented) {
      await restoreMany(
        order.items.map((item) => ({
          productId: String(item.productId),
          quantity: item.quantity,
        })),
      );
      order.inventoryDecremented = false;
    }
  }

  order.history.push({
    fromStatus: previous,
    toStatus: body.status,
    actorType: 'admin',
    actorId: adminId,
    reason: body.reason,
    at: new Date(),
  });

  await order.save();
  logger.info('order.status_updated', {
    orderNumber: order.orderNumber,
    from: previous,
    to: body.status,
    adminId,
  });
  return toPublicOrder(order);
}
