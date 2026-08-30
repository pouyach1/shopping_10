import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';
import type { UserRole } from '../config/constants';
import { verifyAccessToken } from '../services/token.service';
import { getActiveUserById } from '../services/auth.service';
import { ensureMembership } from '../services/membership.service';
import {
  requireTenantContext,
  patchTenantContext,
} from '../tenant/TenantContext';
import { forbidden, unauthorized } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const bearer = header.slice(7).trim();
    if (bearer) return bearer;
  }

  const cookieToken = req.cookies?.[env.AUTH_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.trim()) {
    return cookieToken.trim();
  }

  return null;
}

export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) throw unauthorized();

    const payload = verifyAccessToken(token);
    const user = await getActiveUserById(payload.sub);

    req.user = {
      id: String(user._id),
      role: user.role,
    };

    // Ensure customer membership for the resolved store (idempotent).
    // Elevated roles are never granted here — only seed/migration/grantStoreRole.
    try {
      const tenant = requireTenantContext();
      const membership = await ensureMembership(
        tenant.storeId,
        String(user._id),
        'customer',
      );
      patchTenantContext({
        userId: String(user._id),
        membershipRole: membership.role,
      });
      req.tenant = {
        ...tenant,
        userId: String(user._id),
        membershipRole: membership.role,
      };
      req.membership = {
        role: membership.role,
        status: membership.status,
      };
    } catch {
      // Tenant unresolved — store-scoped handlers will fail closed.
    }

    next();
  },
);

/**
 * Legacy platform role gate — prefer requireStoreRole for store admin APIs.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(forbidden());
      return;
    }
    next();
  };
}
