import { User, type UserDocument } from '../models/User';
import {
  parseOrThrow,
  registerSchema,
  loginSchema,
  type RegisterInput,
  type LoginInput,
} from '../validators/auth.validators';
import { hashPassword, verifyPassword } from '../utils/password';
import { normalizeIranianPhone } from '../utils/phone';
import { conflict, unauthorized } from '../utils/AppError';
import { signAccessToken } from './token.service';
import { toPublicUser } from './user.mapper';
import type { PublicUser } from '../types/express';

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
}

async function assertUniqueContacts(
  phone?: string,
  email?: string,
  excludeUserId?: string,
): Promise<void> {
  if (phone) {
    const existingPhone = await User.findOne({
      phone,
      ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
    }).lean();
    if (existingPhone) {
      throw conflict('این شماره موبایل قبلاً ثبت شده است.', {
        phone: 'این شماره موبایل قبلاً ثبت شده است.',
      });
    }
  }

  if (email) {
    const existingEmail = await User.findOne({
      email,
      ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
    }).lean();
    if (existingEmail) {
      throw conflict('این ایمیل قبلاً ثبت شده است.', {
        email: 'این ایمیل قبلاً ثبت شده است.',
      });
    }
  }
}

export async function registerUser(raw: unknown): Promise<AuthResult> {
  const input: RegisterInput = parseOrThrow(registerSchema, raw);
  await assertUniqueContacts(input.phone, input.email);

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    email: input.email,
    passwordHash,
    role: 'customer',
    isActive: true,
    lastLoginAt: new Date(),
  });

  const accessToken = signAccessToken({
    userId: String(user._id),
    role: user.role,
  });

  return { user: toPublicUser(user), accessToken };
}

async function findUserForLogin(identifier: string): Promise<UserDocument | null> {
  const trimmed = identifier.trim();
  const phone = normalizeIranianPhone(trimmed);
  if (phone) {
    return User.findOne({ phone }).select('+passwordHash');
  }

  const email = trimmed.toLowerCase();
  return User.findOne({ email }).select('+passwordHash');
}

export async function loginUser(raw: unknown): Promise<AuthResult & { remember: boolean }> {
  const input: LoginInput = parseOrThrow(loginSchema, raw);
  const user = await findUserForLogin(input.identifier);

  // Generic message — do not reveal whether the account exists.
  const invalid = () => unauthorized('اطلاعات ورود صحیح نیست.');

  if (!user?.passwordHash) throw invalid();

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) throw invalid();

  if (!user.isActive) {
    throw unauthorized('حساب کاربری غیرفعال است.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken({
    userId: String(user._id),
    role: user.role,
  });

  return {
    user: toPublicUser(user),
    accessToken,
    remember: input.remember,
  };
}

export async function getUserById(userId: string): Promise<UserDocument | null> {
  return User.findById(userId);
}

export async function getActiveUserById(userId: string): Promise<UserDocument> {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw unauthorized('نشست نامعتبر است.');
  }
  return user;
}
