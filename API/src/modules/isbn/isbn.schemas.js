import { z } from 'zod';

export const isbnParamsSchema = z.object({
  isbn: z.string()
    .trim()
    .min(10, 'O ISBN deve ter pelo menos 10 caracteres.')
    .max(32, 'O ISBN deve ter no máximo 32 caracteres.')
    .regex(/^[0-9Xx-]+$/, 'Use apenas números, hífens e a letra X no ISBN.')
}).strict();

const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const listItem = (max) => z.string().trim().min(1).max(max);

export const isbnProviderBookSchema = z.object({
  provider: z.string().trim().min(1).max(64).nullable().optional(),
  title: z.string().trim().min(1).max(160),
  subtitle: optionalText(180),
  authors: z.array(listItem(120)).max(12).optional(),
  publisher: optionalText(120),
  synopsis: optionalText(3000),
  year: z.number().int().min(1000).max(new Date().getFullYear() + 1).nullable().optional(),
  page_count: z.number().int().positive().max(20000).nullable().optional(),
  subjects: z.array(listItem(80)).max(20).optional(),
  cover_url: z.string()
    .trim()
    .max(2048)
    .url()
    .refine((value) => /^https?:\/\//i.test(value))
    .nullable()
    .optional()
}).passthrough();
