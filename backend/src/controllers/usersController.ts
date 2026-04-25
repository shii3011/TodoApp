import type { Request, Response, NextFunction } from 'express';
import { upsertUserSchema } from '../schemas/userSchemas.js';
import * as usersService from '../services/usersService.js';

export async function upsertUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = upsertUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }
  try {
    const userId = res.locals['userId'] as string;
    const user = await usersService.upsertUser(userId, result.data.email, result.data.name);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function getUser(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = res.locals['userId'] as string;
    const user = await usersService.getUser(userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
