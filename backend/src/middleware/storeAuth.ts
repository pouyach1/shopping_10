import type { NextFunction, Request, Response } from 'express';

import type { StoreMembershipRole } from '../config/constants';
import {
  findActiveMembership,
  roleAtLeast,
} from '../services/membership.service';
import { requireTenantContext, patchTenantContext } from '../tenant/TenantContext';
import { forbidden, unauthorized } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * After requireAuth + resolveTenant: attach membership to tenant context.
 * Public routes skip this. Does not create memberships.
 */
export const attachStoreMembership = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const tenant = requireTenantContext();
    if (!req.user) {
      next();
      return;
    }

    const membership = await findActiveMembership(tenant.storeId, req.user.id);
    if (membership) {
      patchTenantContext({
        userId: req.user.id,
        membershipRole: membership.role,
      });
      req.tenant = {
        ...tenant,
        userId: req.user.id,
        membershipRole: membership.role,
      };
      req.membership = {
        role: membership.role,
        status: membership.status,
      };
    } else {
      patchTenantContext({ userId: req.user.id });
      req.tenant = { ...tenant, userId: req.user.id };
    }
    next();
  },
);

/**
 * Require store membership role at least `minimum` (owner > admin > staff > customer).
 * Fail closed — missing membership is forbidden, not a silent global admin.
 */
export function requireStoreRole(...minimums: StoreMembershipRole[]) {
  const required = minimums.length > 0 ? minimums : (['admin'] as StoreMembershipRole[]);

  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw unauthorized();
    }
    const tenant = requireTenantContext();
    const membership = await findActiveMembership(tenant.storeId, req.user.id);
    if (!membership) {
      throw forbidden('دسترسی به این فروشگاه مجاز نیست.');
    }

    const ok = required.some((role) => roleAtLeast(membership.role, role));
    if (!ok) {
      throw forbidden('نقش فروشگاهی کافی نیست.');
    }

    patchTenantContext({
      userId: req.user.id,
      membershipRole: membership.role,
    });
    req.tenant = {
      ...tenant,
      userId: req.user.id,
      membershipRole: membership.role,
    };
    req.membership = {
      role: membership.role,
      status: membership.status,
    };
    next();
  });
}
