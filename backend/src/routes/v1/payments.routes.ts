import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as paymentsController from '../../controllers/payments.controller';
import { requireAuth } from '../../middleware/authenticate';
import { env } from '../../config/env';

/** Provider webhooks resolve store from payment authority — no tenant header. */
export const paymentWebhookRouter = Router();

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

paymentWebhookRouter.post(
  '/payments/webhooks/:provider',
  webhookRateLimiter,
  paymentsController.webhook,
);

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

router.use(requireAuth);

router.post('/', paymentRateLimiter, paymentsController.create);
router.post('/callback', paymentRateLimiter, paymentsController.callback);
router.get('/:paymentId', paymentsController.getMine);

export default router;
