import type { Request, Response, NextFunction } from 'express';
import { createTagSchema } from '../schemas/tagSchemas.js';
import * as tagsService from '../services/tagsService.js';

export async function listTags(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = res.locals['userId'] as string;
    res.json(await tagsService.listTags(userId));
  } catch (err) { next(err); }
}

export async function createTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = createTagSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }
  try {
    const userId = res.locals['userId'] as string;
    res.status(201).json(await tagsService.createTag(userId, result.data));
  } catch (err) { next(err); }
}

export async function deleteTag(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = res.locals['userId'] as string;
    await tagsService.deleteTag(req.params.id, userId);
    res.status(204).send();
  } catch (err) { next(err); }
}
