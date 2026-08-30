import { Types } from 'mongoose';

import { User } from '../models/User';
import {
  parseOrThrow,
  updateProfileSchema,
  changePasswordSchema,
  addressSchema,
  type UpdateProfileInput,
} from '../validators/auth.validators';
import { hashPassword, verifyPassword } from '../utils/password';
import { conflict, notFound, unauthorized, badRequest } from '../utils/AppError';
import { getActiveUserById } from './auth.service';
import { toPublicUser } from './user.mapper';
import type { PublicUser } from '../types/express';
import { PROTECTED_USER_FIELDS } from '../config/constants';

function rejectProtectedFields(raw: unknown): void {
  if (!raw || typeof raw !== 'object') return;
  const body = raw as Record<string, unknown>;
  for (const field of PROTECTED_USER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      throw badRequest('تغییر این فیلد مجاز نیست.', {
        [field]: 'تغییر این فیلد مجاز نیست.',
      });
    }
  }
}

export async function getMyProfile(userId: string): Promise<PublicUser> {
  const user = await getActiveUserById(userId);
  return toPublicUser(user);
}

export async function updateMyProfile(
  userId: string,
  raw: unknown,
): Promise<PublicUser> {
  rejectProtectedFields(raw);
  const input: UpdateProfileInput = parseOrThrow(updateProfileSchema, raw);
  const user = await getActiveUserById(userId);

  if (input.phone && input.phone !== user.phone) {
    const taken = await User.findOne({
      phone: input.phone,
      _id: { $ne: userId },
    }).lean();
    if (taken) {
      throw conflict('این شماره موبایل قبلاً ثبت شده است.', {
        phone: 'این شماره موبایل قبلاً ثبت شده است.',
      });
    }
    user.phone = input.phone;
  }

  if (input.email !== undefined) {
    if (input.email === null || input.email === '') {
      user.email = undefined;
    } else if (input.email !== user.email) {
      const taken = await User.findOne({
        email: input.email,
        _id: { $ne: userId },
      }).lean();
      if (taken) {
        throw conflict('این ایمیل قبلاً ثبت شده است.', {
          email: 'این ایمیل قبلاً ثبت شده است.',
        });
      }
      user.email = input.email;
    }
  }

  if (input.firstName) user.firstName = input.firstName;
  if (input.lastName) user.lastName = input.lastName;

  // Keep at least one contact channel.
  if (!user.phone && !user.email) {
    throw badRequest('حداقل یکی از شماره موبایل یا ایمیل باید باقی بماند.');
  }

  await user.save();
  return toPublicUser(user);
}

export async function changeMyPassword(
  userId: string,
  raw: unknown,
): Promise<void> {
  const input = parseOrThrow(changePasswordSchema, raw);
  const user = await User.findById(userId).select('+passwordHash');
  if (!user?.passwordHash || !user.isActive) {
    throw unauthorized('نشست نامعتبر است.');
  }

  const ok = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!ok) {
    throw unauthorized('رمز عبور فعلی صحیح نیست.');
  }

  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();
}

export async function addMyAddress(
  userId: string,
  raw: unknown,
): Promise<PublicUser> {
  const input = parseOrThrow(addressSchema, raw);
  const user = await getActiveUserById(userId);

  if (input.isDefault) {
    for (const address of user.addresses) {
      address.isDefault = false;
    }
  }

  user.addresses.push({
    title: input.title,
    recipientName: input.recipientName,
    phone: input.phone,
    province: input.province,
    city: input.city,
    postalCode: input.postalCode,
    addressLine: input.addressLine,
    plaque: input.plaque,
    unit: input.unit,
    isDefault: input.isDefault ?? user.addresses.length === 0,
  });

  await user.save();
  return toPublicUser(user);
}

export async function removeMyAddress(
  userId: string,
  addressId: string,
): Promise<PublicUser> {
  if (!Types.ObjectId.isValid(addressId)) {
    throw notFound('آدرس یافت نشد.');
  }

  const user = await getActiveUserById(userId);
  const before = user.addresses.length;
  user.addresses = user.addresses.filter(
    (address) => String(address._id) !== addressId,
  ) as typeof user.addresses;

  if (user.addresses.length === before) {
    throw notFound('آدرس یافت نشد.');
  }

  if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  return toPublicUser(user);
}
