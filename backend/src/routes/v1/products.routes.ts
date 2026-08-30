import { Router } from 'express';

import * as productsController from '../../controllers/products.controller';

const router = Router();

router.get('/', productsController.listPublic);
router.get('/:slug', productsController.getBySlug);

export default router;
