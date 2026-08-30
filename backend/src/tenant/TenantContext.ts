/**
 * Tenant context — centralized, fail-closed.
 * Controllers/services must use getTenantContext() / requireStoreId().
 * Never read req.body.storeId as the source of truth.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

import { Types } from 'mongoose';

import type { StoreMembershipRole } from '../config/constants';
import { badRequest } from '../utils/AppError';

export interface TenantContext {
  storeId: string;
  storeSlug: string;
  storeStatus: 'active' | 'suspended' | 'disabled';
  userId?: string;
  membershipRole?: StoreMembershipRole;
  requestId?: string;
  /** How the store was resolved — for diagnostics only. */
  resolution: 'subdomain' | 'domain' | 'header' | 'default' | 'explicit';
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(
  context: TenantContext,
  fn: () => T,
): T {
  return storage.run(context, fn);
}

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

export function requireTenantContext(): TenantContext {
  const ctx = storage.getStore();
  if (!ctx?.storeId) {
    throw badRequest('بستر فروشگاه مشخص نیست.', {
      store: 'tenant context missing',
    });
  }
  return ctx;
}

export function requireStoreId(): string {
  return requireTenantContext().storeId;
}

export function requireStoreObjectId(): Types.ObjectId {
  return new Types.ObjectId(requireStoreId());
}

/**
 * Reject client-supplied storeId that disagrees with trusted context.
 */
export function assertStoreIdMatchesContext(
  candidate: string | undefined | null,
): void {
  if (candidate == null || candidate === '') return;
  const ctx = requireTenantContext();
  if (String(candidate) !== ctx.storeId) {
    throw badRequest('شناسه فروشگاه با بستر درخواست هم‌خوانی ندارد.');
  }
}

export function patchTenantContext(
  patch: Partial<TenantContext>,
): TenantContext {
  const current = requireTenantContext();
  const next = { ...current, ...patch };
  storage.enterWith(next);
  return next;
}
