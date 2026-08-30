import { Router } from 'express';

import * as categoriesController from '../../controllers/categories.controller';
import * as productsController from '../../controllers/products.controller';
import * as ordersController from '../../controllers/orders.controller';
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

export default router;
