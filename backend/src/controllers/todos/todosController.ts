import type { Request, Response, NextFunction } from 'express';
import { createTodoSchema, updateTodoSchema, patchTodoSchema } from '../../schemas/todoSchemas.js';
import * as todosService from '../../services/todos/index.js';

export async function listTodos(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = res.locals['userId'] as string;
    const todos = await todosService.listTodos(userId);
    res.json(todos);
  } catch (err) {
    next(err);
  }
}

export async function getTodo(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = res.locals['userId'] as string;
    const todo = await todosService.getTodo(req.params.id, userId);
    res.json(todo);
  } catch (err) {
    next(err);
  }
}

export async function createTodo(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = createTodoSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }
  try {
    const userId = res.locals['userId'] as string;
    const todo = await todosService.createTodo(userId, result.data);
    res.status(201).json(todo);
  } catch (err) {
    next(err);
  }
}

export async function updateTodo(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  const result = updateTodoSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }
  try {
    const userId = res.locals['userId'] as string;
    const todo = await todosService.replaceTodo(req.params.id, userId, result.data);
    res.json(todo);
  } catch (err) {
    next(err);
  }
}

export async function patchTodo(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  const result = patchTodoSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }
  try {
    const userId = res.locals['userId'] as string;
    const todo = await todosService.patchTodo(req.params.id, userId, result.data);
    res.json(todo);
  } catch (err) {
    next(err);
  }
}

export async function deleteTodo(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = res.locals['userId'] as string;
    await todosService.deleteTodo(req.params.id, userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
