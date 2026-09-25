import { z } from 'zod';

export const likesQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['desc', 'asc']).default('desc'),
  bookId: z.string().uuid().optional()
});
