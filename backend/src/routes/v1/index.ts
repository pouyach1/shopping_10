import { Router } from 'express';

import { resolveTenant, rejectClientStoreIdSmuggling } from '../../middleware/tenant';
import { paymentWebhookRouter } from './payments.routes';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import healthRoutes from './health.routes';
import productsRoutes from './products.routes';
import categoriesRoutes from './categories.routes';
import adminRoutes from './admin.routes';
import cartRoutes from './cart.routes';
import wishlistRoutes from './wishlist.routes';
import storeRoutes from './store.routes';
import checkoutRoutes from './checkout.routes';
import ordersRoutes from './orders.routes';
import paymentsRoutes from './payments.routes';

const router = Router();

/** Liveness/readiness — no tenant resolution required. */
router.use('/health', healthRoutes);

/** Payment webhooks bootstrap tenant from payment authority, not request headers. */
router.use(paymentWebhookRouter);

/** All storefront + commerce APIs resolve tenant before handlers run. */
const tenantRouter = Router();
tenantRouter.use(resolveTenant);
tenantRouter.use(rejectClientStoreIdSmuggling);

tenantRouter.use('/auth', authRoutes);
tenantRouter.use('/users', usersRoutes);
tenantRouter.use('/store', storeRoutes);
tenantRouter.use('/products', productsRoutes);
tenantRouter.use('/categories', categoriesRoutes);
tenantRouter.use('/admin', adminRoutes);
tenantRouter.use('/cart', cartRoutes);
tenantRouter.use('/wishlist', wishlistRoutes);
tenantRouter.use('/checkout', checkoutRoutes);
tenantRouter.use('/orders', ordersRoutes);
tenantRouter.use('/payments', paymentsRoutes);

router.use(tenantRouter);

export default router;
