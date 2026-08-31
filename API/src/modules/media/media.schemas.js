import { z } from 'zod';

export const presignSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().int().positive().max(8 * 1024 * 1024)
});

export const completeUploadSchema = z.object({
  imageId: z.string().uuid(),
  storageKey: z.string().min(10).max(500),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().int().positive().max(8 * 1024 * 1024),
  isCover: z.boolean().default(false)
});
