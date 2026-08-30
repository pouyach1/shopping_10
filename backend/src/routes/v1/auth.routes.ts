import { Router } from 'express';

import * as authController from '../../controllers/auth.controller';
import { requireAuth } from '../../middleware/authenticate';
import { authRateLimiter } from '../../middleware/errorHandler';
import { env } from '../../config/env';

const router = Router();

const authGuards = env.isTest ? [] : [authRateLimiter];

router.post('/register', ...authGuards, authController.register);
router.post('/login', ...authGuards, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
