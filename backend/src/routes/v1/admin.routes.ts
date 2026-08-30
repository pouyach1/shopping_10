import { Router } from 'express';

import * as categoriesController from '../../controllers/categories.controller';
import * as productsController from '../../controllers/products.controller';
import * as ordersController from '../../controllers/orders.controller';
import * as paymentsController from '../../controllers/payments.controller';
import * as commerceAdminController from '../../controllers/commerceAdmin.controller';
import { requireAuth, requireRole } from '../../middleware/authenticate';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/categories', categoriesController.adminList);
router.post('/categories', categoriesController.adminCreate);
router.get('/categories/:id', categoriesController.adminGetById);
router.patch('/categories/:id', categoriesController.adminUpdate);
router.delete('/categories/:id', categoriesController.adminDeactivate);

router.get('/products', productsController.adminList);
router.post('/products', productsController.adminCreate);
router.get('/products/:id', productsController.adminGetById);
router.patch('/products/:id', productsController.adminUpdate);
router.delete('/products/:id', productsController.adminArchive);

router.get('/orders', ordersController.adminList);
router.get('/orders/:orderNumber', ordersController.adminGet);
router.patch('/orders/:orderNumber/status', ordersController.adminUpdateStatus);
router.post(
  '/orders/:orderNumber/refund',
  commerceAdminController.adminCreateRefund,
);
router.get(
  '/orders/:orderNumber/timeline',
  commerceAdminController.adminPaymentTimeline,
);

router.get('/payments', paymentsController.adminList);
router.post(
  '/payments/release-expired',
  paymentsController.adminReleaseExpired,
);
router.post(
  '/payments/reconcile-open',
  paymentsController.adminReconcileOpen,
);
router.get('/payments/:paymentId', paymentsController.adminGet);
router.post(
  '/payments/:paymentId/reconcile',
  paymentsController.adminReconcile,
);
router.post(
  '/payments/:paymentId/retry-verification',
  paymentsController.adminRetryVerification,
);
router.post(
  '/payments/:paymentId/manual-review',
  paymentsController.adminMarkManualReview,
);

router.get('/notifications', paymentsController.adminListNotifications);
router.post(
  '/notifications/process',
  paymentsController.adminProcessNotifications,
);
router.post(
  '/notifications/:deliveryId/retry',
  paymentsController.adminRetryNotification,
);

router.get('/refunds', commerceAdminController.adminListRefunds);
router.post(
  '/refunds/:refundId/retry',
  commerceAdminController.adminRetryRefund,
);

router.get('/scheduler/health', paymentsController.adminSchedulerHealth);

router.get('/coupons', commerceAdminController.adminListCoupons);
router.post('/coupons', commerceAdminController.adminCreateCoupon);
router.patch('/coupons/:id', commerceAdminController.adminUpdateCoupon);

export default router;
