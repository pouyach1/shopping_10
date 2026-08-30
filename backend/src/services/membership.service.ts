import { Types } from 'mongoose';

import { type StoreMembershipRole } from '../config/constants';
import {
  StoreMembership,
  type StoreMembershipDocument,
} from '../models/StoreMembership';
import { forbidden, notFound } from '../utils/AppError';

const ROLE_RANK: Record<StoreMembershipRole, number> = {
  owner: 40,
  admin: 30,
  staff: 20,
  customer: 10,
};

export function roleAtLeast(
  actual: StoreMembershipRole,
  required: StoreMembershipRole,
): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export async function findActiveMembership(
  storeId: string,
  userId: string,
): Promise<StoreMembershipDocument | null> {
  return StoreMembership.findOne({
    storeId: new Types.ObjectId(storeId),
    userId: new Types.ObjectId(userId),
    status: 'active',
  });
}

export async function requireActiveMembership(
  storeId: string,
  userId: string,
): Promise<StoreMembershipDocument> {
  const membership = await findActiveMembership(storeId, userId);
  if (!membership) {
    throw forbidden('عضویت فروشگاه یافت نشد.');
  }
  return membership;
}

export async function ensureMembership(
  storeId: string,
  userId: string,
  role: StoreMembershipRole = 'customer',
): Promise<StoreMembershipDocument> {
  const existing = await StoreMembership.findOne({
    storeId: new Types.ObjectId(storeId),
    userId: new Types.ObjectId(userId),
  });
  if (existing) {
    if (existing.status !== 'active') {
      existing.status = 'active';
      await existing.save();
    }
    return existing;
  }
  try {
    return await StoreMembership.create({
      storeId,
      userId,
      role,
      status: 'active',
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      const again = await findActiveMembership(storeId, userId);
      if (again) return again;
    }
    throw error;
  }
}

/**
 * Upsert elevated membership. Never callable from untrusted request JSON —
 * only seed/migration/admin platform flows.
 */
export async function grantStoreRole(
  storeId: string,
  userId: string,
  role: StoreMembershipRole,
): Promise<StoreMembershipDocument> {
  if (!isStoreStaff(role) && role !== 'customer') {
    throw forbidden();
  }
  const membership = await StoreMembership.findOneAndUpdate(
    {
      storeId: new Types.ObjectId(storeId),
      userId: new Types.ObjectId(userId),
    },
    {
      $set: { role, status: 'active' },
      $setOnInsert: {
        storeId: new Types.ObjectId(storeId),
        userId: new Types.ObjectId(userId),
      },
    },
    { upsert: true, returnDocument: 'after' },
  );
  if (!membership) throw notFound('عضویت ایجاد نشد.');
  return membership;
}

export function isStoreStaff(role: StoreMembershipRole | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'staff';
}
