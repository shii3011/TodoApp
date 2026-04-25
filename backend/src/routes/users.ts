import { Router } from 'express';
import * as usersController from '../controllers/usersController.js';

const router = Router();

router.put('/me', usersController.upsertUser);
router.get('/me', usersController.getUser);

export default router;
