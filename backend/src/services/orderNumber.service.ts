import { Schema, model, type Types } from 'mongoose';

import {
  formatStoreOrderNumber,
  getOrderPrefix,
} from './storeConfig.service';
import { storeObjectId, storeScope } from '../tenant/storeScope';

interface OrderCounterAttrs {
  storeId: Types.ObjectId;
  year: number;
  seq: number;
}

const orderCounterSchema = new Schema<OrderCounterAttrs>({
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  year: { type: Number, required: true },
  seq: { type: Number, required: true, default: 0 },
});

orderCounterSchema.index({ storeId: 1, year: 1 }, { unique: true });

const OrderCounter = model<OrderCounterAttrs>('OrderCounter', orderCounterSchema);

/** Atomically allocate the next customer-facing order number for the current store. */
export async function allocateOrderNumber(): Promise<string> {
  const storeId = storeObjectId();
  const year = new Date().getFullYear();
  const prefix = await getOrderPrefix();
  const counter = await OrderCounter.findOneAndUpdate(
    storeScope({ year }),
    {
      $inc: { seq: 1 },
      $setOnInsert: { storeId },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  const seq = counter?.seq ?? 1;
  return formatStoreOrderNumber(prefix, year, seq);
}
