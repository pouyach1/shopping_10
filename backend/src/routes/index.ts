import { Router } from 'express';

import v1 from './v1';
import { healthLive } from '../middleware/errorHandler';

const router = Router();

// Versioned API
router.use('/v1', v1);

// Temporary compatibility aliases (Phase 1). Prefer /api/v1/...
router.get('/health', healthLive);

export default router;
