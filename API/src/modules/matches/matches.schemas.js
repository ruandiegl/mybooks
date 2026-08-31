import { z } from 'zod';

export const interactionSchema = z.object({
  targetBookId: z.string().uuid(),
  action: z.enum(['LIKE', 'PASS']),
  clientActionId: z.string().uuid()
});
