import { Router } from 'express';
import * as tagsController from '../controllers/tagsController.js';

const router = Router();

router.get('/', tagsController.listTags);
router.post('/', tagsController.createTag);
router.delete('/:id', tagsController.deleteTag);

export default router;
