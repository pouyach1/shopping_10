import { Router } from 'express';

import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);

export default router;
