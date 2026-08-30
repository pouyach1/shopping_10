import { Order, type OrderDocument } from '../models/Order';
import {
  parseOrThrow,
  orderListQuerySchema,
  orderNumberParamSchema,
  adminOrderStatusSchema,
  cancelOrderSchema,
} from '../validators/order.validators';
import { conflict, notFound } from '../utils/AppError';
import { logger } from '../utils/logger';
import { toPublicOrder, type PublicOrder } from './order.mapper';
import {
  assertCustomerCancellable,
  assertTransition,
  nextFulfillmentForOrderStatus,
} from './orderTransitions';
import { recordAudit } from './audit.service';
import { emitCommerceEvent } from './notifications';
import { claimAndRestoreOrderInventory } from './inventoryRelease.service';
import { CUSTOMER_CANCELLABLE } from './orderTransitions';

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

/**
 * Customer cancel — atomic status claim, then one-time inventory release.
 * Paid orders are not customer-cancellable (Option A).
 */
export async function cancelCustomerOrder(
  userId: string,
  orderNumberRaw: string,
  rawBody: unknown,
): Promise<PublicOrder> {
  const { orderNumber } = parseOrThrow(orderNumberParamSchema, {
    orderNumber: orderNumberRaw,
  });
  const body = parseOrThrow(cancelOrderSchema, rawBody ?? {});

  const owned = await findOwnedOrder(orderNumber, userId);
  assertCustomerCancellable(owned.status);
  assertTransition(owned.status, 'cancelled');

  const previous = owned.status;
  const cancelled = await Order.findOneAndUpdate(
    {
      _id: owned._id,
      user: userId,
      status: { $in: [...CUSTOMER_CANCELLABLE] },
    },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
      $push: {
        history: {
          fromStatus: previous,
          toStatus: 'cancelled',
          actorType: 'customer',
          actorId: userId,
          reason: body.reason || 'لغو توسط مشتری',
          at: new Date(),
        },
      },
    },
    { returnDocument: 'after' },
  );

  if (!cancelled) {
    throw conflict(
      'این سفارش قابل لغو نیست.',
      undefined,
      'ORDER_NOT_CANCELLABLE',
    );
  }

  await claimAndRestoreOrderInventory(cancelled._id, 'customer_cancel', {
    type: 'customer',
    id: userId,
  });

  await recordAudit({
    action: 'order.cancelled',
    actorType: 'customer',
    actorId: userId,
    entityType: 'order',
    entityId: String(cancelled._id),
    orderNumber: cancelled.orderNumber,
  });
  emitCommerceEvent('OrderCancelled', {
    orderNumber: cancelled.orderNumber,
    userId,
  });
  logger.info('order.cancelled', {
    orderNumber: cancelled.orderNumber,
    userId,
    actor: 'customer',
  });

  const fresh = await Order.findById(cancelled._id);
  return toPublicOrder(fresh ?? cancelled);
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

  // Admin marking paid: refuse if already cancelled (use refund workflow).
  if (body.status === 'paid' && previous === 'cancelled') {
    throw conflict(
      'سفارش لغوشده قابل پرداخت‌شدن دستی نیست.',
      undefined,
      'INVALID_ORDER_TRANSITION',
    );
  }

  const fulfillment = nextFulfillmentForOrderStatus(body.status);
  const setFields: Record<string, unknown> = {
    status: body.status,
  };
  if (fulfillment) setFields.fulfillmentStatus = fulfillment;
  if (body.status === 'paid') {
    setFields.paymentStatus = 'paid';
    setFields.paidAt = new Date();
    setFields.inventoryReservedUntil = null;
  }
  if (body.status === 'cancelled' || body.status === 'failed') {
    setFields.cancelledAt = new Date();
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: previous },
    {
      $set: setFields,
      $push: {
        history: {
          fromStatus: previous,
          toStatus: body.status,
          actorType: 'admin',
          actorId: adminId,
          reason: body.reason,
          at: new Date(),
        },
      },
    },
    { returnDocument: 'after' },
  );

  if (!updated) {
    throw conflict(
      'تغییر وضعیت سفارش مجاز نیست.',
      undefined,
      'INVALID_ORDER_TRANSITION',
    );
  }

  if (body.status === 'cancelled' || body.status === 'failed') {
    await claimAndRestoreOrderInventory(updated._id, 'admin_cancel', {
      type: 'admin',
      id: adminId,
    });
  }

  logger.info('order.status_updated', {
    orderNumber: updated.orderNumber,
    from: previous,
    to: body.status,
    adminId,
  });

  const fresh = await Order.findById(updated._id);
  return toPublicOrder(fresh ?? updated);
}
