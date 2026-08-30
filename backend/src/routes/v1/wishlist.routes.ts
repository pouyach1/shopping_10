import { Router } from 'express';

import * as wishlistController from '../../controllers/wishlist.controller';
import { requireAuth } from '../../middleware/authenticate';

const router = Router();

router.use(requireAuth);

router.get('/', wishlistController.getWishlist);
router.post('/merge', wishlistController.merge);
router.post('/:productId', wishlistController.addProduct);
router.delete('/:productId', wishlistController.removeProduct);

export default router;
