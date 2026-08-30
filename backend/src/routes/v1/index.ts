import { Router } from 'express';

import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import healthRoutes from './health.routes';
import productsRoutes from './products.routes';
import categoriesRoutes from './categories.routes';
import adminRoutes from './admin.routes';
import cartRoutes from './cart.routes';
import wishlistRoutes from './wishlist.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/admin', adminRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);

export default router;
