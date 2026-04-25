import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color format').default('#38a8f5'),
});
