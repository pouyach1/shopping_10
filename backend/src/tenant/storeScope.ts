import { Types } from 'mongoose';

import { requireStoreId } from '../tenant/TenantContext';

/** Leading storeId filter for every tenant-owned query. */
export function storeScope(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    storeId: new Types.ObjectId(requireStoreId()),
    ...extra,
  };
}

export function storeObjectId(): Types.ObjectId {
  return new Types.ObjectId(requireStoreId());
}
