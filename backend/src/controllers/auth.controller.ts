import type { Request, Response } from 'express';

import * as authService from '../services/auth.service';
import { clearAuthCookie, setAuthCookie, toPublicUser } from '../services/user.mapper';
import { asyncHandler } from '../utils/asyncHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);
  setAuthCookie(res, result.accessToken, true);
  res.status(201).json({
    status: 'success',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);
  setAuthCookie(res, result.accessToken, result.remember);
  res.status(200).json({
    status: 'success',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.status(200).json({
    status: 'success',
    message: 'با موفقیت خارج شدید.',
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getActiveUserById(req.user!.id);
  res.status(200).json({
    status: 'success',
    data: { user: toPublicUser(user) },
  });
});
