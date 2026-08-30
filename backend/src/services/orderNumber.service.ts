import { Schema, model } from 'mongoose';

import { ORDER_NUMBER_PREFIX } from '../config/constants';

interface OrderCounterAttrs {
  year: number;
  seq: number;
}

const orderCounterSchema = new Schema<OrderCounterAttrs>({
  year: { type: Number, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

const OrderCounter = model<OrderCounterAttrs>('OrderCounter', orderCounterSchema);

/** Atomically allocate the next customer-facing order number: LUX-YYYY-000001 */
export async function allocateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await OrderCounter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  const seq = counter?.seq ?? 1;
  return `${ORDER_NUMBER_PREFIX}-${year}-${String(seq).padStart(6, '0')}`;
}
