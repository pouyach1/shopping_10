import { Router } from 'express';

import * as checkoutController from '../../controllers/checkout.controller';
import * as ordersController from '../../controllers/orders.controller';
import { requireAuth } from '../../middleware/authenticate';

const router = Router();

router.use(requireAuth);
router.post('/', checkoutController.create);
router.get('/', ordersController.listMine);
router.get('/:orderNumber', ordersController.getMine);
router.post('/:orderNumber/cancel', ordersController.cancelMine);

export default router;
