import { z } from 'zod';
import { normalizePhone } from '../auth/validators.js';

const phoneSchema = z.string().trim().max(24).superRefine((value, context) => {
  try { normalizePhone(value); } catch { context.addIssue({ code: 'custom', message: 'Telefone brasileiro inválido.' }); }
}).transform(normalizePhone);

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: phoneSchema.nullable().optional(),
  bio: z.string().trim().max(280).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(12).transform((items) => [...new Set(items)]).optional()
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'Informe ao menos um campo para atualizar.'
});
