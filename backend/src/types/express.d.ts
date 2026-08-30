import type { UserRole, StoreMembershipRole } from '../config/constants';
import type { TenantContext } from '../tenant/TenantContext';

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
}

export interface PublicAddress {
  id: string;
  title: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  postalCode?: string;
  addressLine: string;
  plaque?: string;
  unit?: string;
  isDefault: boolean;
}

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  addresses: PublicAddress[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
      requestId?: string;
      /** Trusted tenant context — set by resolveTenant middleware. */
      tenant?: TenantContext;
      membership?: {
        role: StoreMembershipRole;
        status: string;
      };
    }
  }
}

export {};
