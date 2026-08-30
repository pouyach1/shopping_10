import { Router } from 'express';

import * as categoriesController from '../../controllers/categories.controller';

const router = Router();

router.get('/', categoriesController.listPublic);
router.get('/:slug', categoriesController.getBySlug);

export default router;
