import { z } from 'zod';

const priorityEnum = z.enum(['low', 'medium', 'high']);

export const createTodoSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().max(1000).default(''),
  priority: priorityEnum.default('medium'),
  dueDate: z.iso.datetime({ offset: true }).optional(),
  tagIds: z.array(z.uuid()).optional(),
  parentId: z.uuid().optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().max(1000).default(''),
  priority: priorityEnum.default('medium'),
  completed: z.boolean().default(false),
  dueDate: z.iso.datetime({ offset: true }).nullable().optional(),
  tagIds: z.array(z.uuid()).default([]),
  parentId: z.uuid().nullable().optional(),
});

export const patchTodoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().max(1000).optional(),
  priority: priorityEnum.optional(),
  completed: z.boolean().optional(),
  dueDate: z.iso.datetime({ offset: true }).nullable().optional(),
  tagIds: z.array(z.uuid()).optional(),
  parentId: z.uuid().nullable().optional(),
});
