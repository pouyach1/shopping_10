import type { Request, Response } from 'express';

import * as userService from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getMyProfile(req.user!.id);
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateMyProfile(req.user!.id, req.body);
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await userService.changeMyPassword(req.user!.id, req.body);
  res.status(200).json({
    status: 'success',
    message: 'رمز عبور با موفقیت تغییر کرد.',
  });
});

export const addAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.addMyAddress(req.user!.id, req.body);
  res.status(201).json({
    status: 'success',
    data: { user },
  });
});

export const removeAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.removeMyAddress(
    req.user!.id,
    String(req.params.addressId),
  );
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});
