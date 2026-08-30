import { Router } from 'express';

import * as checkoutController from '../../controllers/checkout.controller';
import { requireAuth } from '../../middleware/authenticate';

const router = Router();

router.use(requireAuth);
router.post('/preview', checkoutController.preview);

export default router;
