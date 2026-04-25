import { Router } from 'express';
import * as todosController from '../controllers/todosController.js';

const router = Router();

router.get('/', todosController.listTodos);
router.get('/:id', todosController.getTodo);
router.post('/', todosController.createTodo);
router.put('/:id', todosController.updateTodo);
router.patch('/:id', todosController.patchTodo);
router.delete('/:id', todosController.deleteTodo);

export default router;
