import { Router } from 'express';

import * as usersController from '../../controllers/users.controller';
import { requireAuth } from '../../middleware/authenticate';

const router = Router();

router.use(requireAuth);

router.get('/me', usersController.getMe);
router.patch('/me', usersController.updateMe);
router.post('/me/password', usersController.changePassword);
router.post('/me/addresses', usersController.addAddress);
router.delete('/me/addresses/:addressId', usersController.removeAddress);

export default router;
