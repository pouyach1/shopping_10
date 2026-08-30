export const USER_ROLES = ['customer', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const AUTH_COOKIE_PATH = '/';

/** Fields a client may never set via profile update. */
export const PROTECTED_USER_FIELDS = [
  'role',
  'passwordHash',
  'password',
  'isActive',
  '_id',
  'id',
  'createdAt',
  'updatedAt',
  'lastLoginAt',
] as const;
