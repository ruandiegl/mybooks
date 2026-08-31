import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(24).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().trim().max(280).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: 'Informe ao menos um campo para atualizar.'
});
