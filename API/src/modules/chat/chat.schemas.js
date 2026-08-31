import { z } from 'zod';

export const messageSchema = z.object({
  clientMessageId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000)
});

export const messagePaginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30)
});

export const conversationIdSchema = z.string().uuid();
