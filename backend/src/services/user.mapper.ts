import type { CookieOptions, Response } from 'express';

import { env } from '../config/env';
import { AUTH_COOKIE_PATH } from '../config/constants';
import type { AddressDocument, UserDocument } from '../models/User';
import type { PublicAddress, PublicUser } from '../types/express';

export function toPublicAddress(address: AddressDocument): PublicAddress {
  return {
    id: String(address._id),
    title: address.title,
    recipientName: address.recipientName,
    phone: address.phone,
    province: address.province,
    city: address.city,
    postalCode: address.postalCode || undefined,
    addressLine: address.addressLine,
    plaque: address.plaque || undefined,
    unit: address.unit || undefined,
    isDefault: Boolean(address.isDefault),
  };
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone || undefined,
    email: user.email || undefined,
    role: user.role,
    isActive: user.isActive,
    addresses: (user.addresses ?? []).map(toPublicAddress),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt
      ? user.lastLoginAt.toISOString()
      : undefined,
  };
}

/**
 * Cookie auth model (Phase 6.5):
 * - Default sameSite=lax (blocks most cross-site CSRF POSTs).
 * - Cross-site SPAs that need cookies must set AUTH_COOKIE_SAMESITE=none
 *   AND rely on csrfCookieGuard Origin checks + Secure.
 * - Bearer Authorization clients are unaffected.
 */
export function getAuthCookieOptions(maxAgeMs?: number): CookieOptions {
  const sameSite = env.AUTH_COOKIE_SAMESITE;
  return {
    httpOnly: true,
    secure: env.isProd || sameSite === 'none',
    sameSite,
    path: AUTH_COOKIE_PATH,
    maxAge: maxAgeMs,
  };
}

export function setAuthCookie(res: Response, token: string, remember = true): void {
  const maxAge = remember ? 7 * 24 * 60 * 60 * 1000 : undefined;
  res.cookie(env.AUTH_COOKIE_NAME, token, getAuthCookieOptions(maxAge));
}

export function clearAuthCookie(res: Response): void {
  const sameSite = env.AUTH_COOKIE_SAMESITE;
  res.clearCookie(env.AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProd || sameSite === 'none',
    sameSite,
    path: AUTH_COOKIE_PATH,
  });
}
