import { Router } from 'express';

import * as cartController from '../../controllers/cart.controller';
import { requireAuth } from '../../middleware/authenticate';

const router = Router();

router.use(requireAuth);

router.get('/', cartController.getCart);
router.post('/items', cartController.addItem);
router.patch('/items/:productId', cartController.updateItem);
router.delete('/items/:productId', cartController.removeItem);
router.delete('/', cartController.clear);
router.post('/merge', cartController.merge);

export default router;
