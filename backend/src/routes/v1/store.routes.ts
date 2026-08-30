import { Router } from 'express';

import { toPublicStore, getStoreById } from '../../services/storeConfig.service';
import { requireTenantContext } from '../../tenant/TenantContext';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

/** Public storefront configuration for the resolved tenant (no secrets). */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const ctx = requireTenantContext();
    const store = await getStoreById(ctx.storeId);
    res.json({
      status: 'success',
      data: { store: toPublicStore(store) },
    });
  }),
);

export default router;
