import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import type { UserRole } from '../config/constants';
import type { AuthTokenPayload } from '../types/express';
import { unauthorized } from '../utils/AppError';

export interface SignTokenInput {
  userId: string;
  role: UserRole;
}

export function signAccessToken(input: SignTokenInput): string {
  const payload: AuthTokenPayload = {
    sub: input.userId,
    role: input.role,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      typeof (decoded as AuthTokenPayload).sub !== 'string' ||
      typeof (decoded as AuthTokenPayload).role !== 'string'
    ) {
      throw unauthorized('نشست نامعتبر است.');
    }
    return decoded as AuthTokenPayload;
  } catch {
    throw unauthorized('نشست نامعتبر یا منقضی شده است.');
  }
}
