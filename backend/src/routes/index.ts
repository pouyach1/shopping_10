import { Router } from 'express';
import healthRoutes from './health.routes';

/**
 * Aggregates all feature routers. Mounted under the `/api` prefix in app.ts,
 * so `health.routes` `/health` becomes `/api/health`.
 */
const router = Router();

router.use(healthRoutes);

export default router;
