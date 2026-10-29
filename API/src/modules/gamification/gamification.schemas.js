import { z } from 'zod';

export const checkInSchema = z.object({}).strict();

export const leaderboardQuerySchema = z.object({
  scope: z.enum(['global', 'matches']).default('global')
}).strict();
