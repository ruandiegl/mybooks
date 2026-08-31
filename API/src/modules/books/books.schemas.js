import { z } from 'zod';

export const createBookSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(180).nullable().optional(),
  authors: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  publisher: z.string().trim().max(120).nullable().optional(),
  synopsis: z.string().trim().max(3000).nullable().optional(),
  year: z.number().int().min(1000).max(new Date().getFullYear() + 1).nullable().optional(),
  pageCount: z.number().int().positive().max(20000).nullable().optional(),
  subjects: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  isbn: z.string().trim().max(32).nullable().optional(),
  availability: z.enum(['AVAILABLE', 'RESERVED', 'EXCHANGED']).default('AVAILABLE')
});

export const updateBookSchema = createBookSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Informe ao menos um campo para atualizar.' }
);

export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const bookIdSchema = z.string().uuid();

export const bookListSchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  sort: z.enum(['recent', 'oldest', 'title']).default('recent'),
  availability: z.enum(['AVAILABLE', 'RESERVED', 'EXCHANGED']).optional()
});
