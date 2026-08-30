import { Types, type ClientSession } from 'mongoose';

import { Product } from '../models/Product';
import { conflict } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Atomic stock decrement. Succeeds only when stock >= quantity and product is active.
 * Prevents oversell under concurrent checkouts without requiring a multi-doc transaction.
 */
export async function decrementStock(
  productId: string,
  quantity: number,
  session?: ClientSession,
): Promise<void> {
  const query = Product.findOneAndUpdate(
    {
      _id: new Types.ObjectId(productId),
      status: 'active',
      stock: { $gte: quantity },
    },
    { $inc: { stock: -quantity } },
    { returnDocument: 'after' },
  );
  if (session) query.session(session);
  const updated = await query;
  if (!updated) {
    throw conflict(
      'موجودی کافی نیست.',
      { stock: 'موجودی کافی نیست.' },
      'INSUFFICIENT_STOCK',
    );
  }
  logger.info('inventory.decremented', {
    productId,
    quantity,
    remaining: updated.stock,
  });
}

export async function restoreStock(
  productId: string,
  quantity: number,
  session?: ClientSession,
): Promise<void> {
  const query = Product.findByIdAndUpdate(productId, {
    $inc: { stock: quantity },
  });
  if (session) query.session(session);
  await query;
  logger.info('inventory.restored', { productId, quantity });
}

export async function decrementMany(
  lines: Array<{ productId: string; quantity: number }>,
  session?: ClientSession,
): Promise<void> {
  const applied: Array<{ productId: string; quantity: number }> = [];
  try {
    for (const line of lines) {
      await decrementStock(line.productId, line.quantity, session);
      applied.push(line);
    }
  } catch (error) {
    for (const line of applied.reverse()) {
      await restoreStock(line.productId, line.quantity, session);
    }
    throw error;
  }
}

export async function restoreMany(
  lines: Array<{ productId: string; quantity: number }>,
  session?: ClientSession,
): Promise<void> {
  for (const line of lines) {
    await restoreStock(line.productId, line.quantity, session);
  }
}
