import { z } from 'zod';
export const updatePreferencesSchema = z.object({ showLikesBadge: z.boolean() }).strict();
