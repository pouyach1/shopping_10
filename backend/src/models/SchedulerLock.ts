import { Schema, model, type HydratedDocument } from 'mongoose';

/**
 * Lightweight Mongo leadership lease for in-process schedulers.
 * Multiple instances may attempt ticks; only the lease holder runs the job body.
 * Prefer external cron hitting admin endpoints when operating many replicas.
 */
export interface SchedulerLockAttrs {
  name: string;
  owner: string;
  lockedUntil: Date;
  lastTickAt?: Date;
  lastResult?: Record<string, unknown>;
  updatedAt: Date;
  createdAt: Date;
}

const schema = new Schema<SchedulerLockAttrs>(
  {
    name: { type: String, required: true, unique: true, maxlength: 80 },
    owner: { type: String, required: true, maxlength: 120 },
    lockedUntil: { type: Date, required: true, index: true },
    lastTickAt: { type: Date },
    lastResult: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export type SchedulerLockDocument = HydratedDocument<SchedulerLockAttrs>;

export const SchedulerLock = model<SchedulerLockAttrs>(
  'SchedulerLock',
  schema,
);
