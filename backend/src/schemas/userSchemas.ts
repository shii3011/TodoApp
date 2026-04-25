import { z } from 'zod';

export const upsertUserSchema = z.object({
  email: z.string().email('email must be a valid email address'),
  name: z.string().optional(),
});
