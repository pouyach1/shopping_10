import { Router } from 'express';

import { healthLive, healthReady } from '../../middleware/errorHandler';

const router = Router();

router.get('/', healthLive);
router.get('/live', healthLive);
router.get('/ready', healthReady);

export default router;
