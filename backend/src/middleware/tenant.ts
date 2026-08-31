import type { NextFunction, Request, Response } from 'express';

import {
  DEFAULT_STORE_SLUG,
  STORE_SLUG_HEADER,
} from '../config/constants';
import { env } from '../config/env';
import { Store } from '../models/Store';
import {
  runWithTenantContext,
  type TenantContext,
  assertStoreIdMatchesContext,
} from '../tenant/TenantContext';
import { badRequest, notFound } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../utils/logger';

function parseHost(hostHeader: string | undefined): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(':')[0]?.trim().toLowerCase();
  return host || null;
}

function subdomainOf(host: string, baseDomain: string): string | null {
  const base = baseDomain.toLowerCase();
  if (!host.endsWith(`.${base}`)) return null;
  const sub = host.slice(0, -(base.length + 1));
  if (!sub || sub.includes('.')) return null;
  if (sub === 'www' || sub === 'api') return null;
  return sub;
}

/**
 * Resolves the active store from trusted request metadata only:
 * 1. Host → custom domain
 * 2. Host → subdomain of PLATFORM_BASE_DOMAIN
 * 3. x-store-slug header (explicit public/test resolution)
 * 4. DEFAULT_STORE_SLUG / env fallback
 *
 * Never trusts body.storeId / query.storeId as the resolution source.
 */
export const resolveTenant = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    // Reject client attempts to smuggle a foreign storeId via body/query as authority.
    // Values may still appear for validation against context later.
    const host = parseHost(req.headers.host);
    let store = null;
    let resolution: TenantContext['resolution'] = 'default';

    if (host) {
      store = await Store.findOne({ domain: host, status: 'active' });
      if (store) resolution = 'domain';
    }

    if (!store && host && env.PLATFORM_BASE_DOMAIN) {
      const sub = subdomainOf(host, env.PLATFORM_BASE_DOMAIN);
      if (sub) {
        store = await Store.findOne({ subdomain: sub, status: 'active' });
        if (store) resolution = 'subdomain';
      }
    }

    if (!store) {
      const headerSlug = req.header(STORE_SLUG_HEADER)?.trim().toLowerCase();
      if (headerSlug) {
        store = await Store.findOne({ slug: headerSlug, status: 'active' });
        if (store) resolution = 'header';
        else throw notFound('فروشگاه یافت نشد.');
      }
    }

    if (!store) {
      const slug = env.DEFAULT_STORE_SLUG || DEFAULT_STORE_SLUG;
      store = await Store.findOne({ slug, status: 'active' });
      resolution = 'default';
    }

    if (!store) {
      throw badRequest('هیچ فروشگاه فعالی برای این درخواست یافت نشد.', {
        store: 'tenant unresolved',
      });
    }

    const context: TenantContext = {
      storeId: String(store._id),
      storeSlug: store.slug,
      storeStatus: store.status,
      requestId: req.requestId,
      resolution,
    };

    req.tenant = context;

    logger.debug('tenant.resolved', {
      requestId: req.requestId,
      storeId: context.storeId,
      storeSlug: context.storeSlug,
      resolution: context.resolution,
    });

    runWithTenantContext(context, () => {
      next();
    });
  },
);

/**
 * Reject body/query storeId that disagrees with resolved tenant context.
 * Must run after resolveTenant.
 */
export const rejectClientStoreIdSmuggling = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const bodyStoreId =
    req.body && typeof req.body === 'object' && 'storeId' in req.body
      ? String((req.body as { storeId?: unknown }).storeId ?? '')
      : undefined;
  const queryStoreId =
    typeof req.query.storeId === 'string' ? req.query.storeId : undefined;

  if (bodyStoreId) {
    assertStoreIdMatchesContext(bodyStoreId);
  }
  if (queryStoreId) {
    assertStoreIdMatchesContext(queryStoreId);
  }
  next();
};
