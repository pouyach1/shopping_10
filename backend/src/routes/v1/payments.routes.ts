import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as paymentsController from '../../controllers/payments.controller';
import { requireAuth } from '../../middleware/authenticate';
import { env } from '../../config/env';

const router = Router();

const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isTest ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'تعداد درخواست‌های پرداخت بیش از حد است.',
  },
});

/** Provider webhooks must not share aggressive user-facing limits. */
const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.isTest ? 2000 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Webhook rate limit exceeded.',
  },
});

router.post(
  '/webhooks/:provider',
  webhookRateLimiter,
  paymentsController.webhook,
);

router.use(requireAuth);

router.post('/', paymentRateLimiter, paymentsController.create);
router.post('/callback', paymentRateLimiter, paymentsController.callback);
router.get('/:paymentId', paymentsController.getMine);

export default router;
