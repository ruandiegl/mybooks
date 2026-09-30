import { z } from 'zod';

export const presignSchema = z.object({
  mimeType: z.unknown().optional(),
  size: z.unknown().optional()
});

export const completeUploadSchema = z.object({
  imageId: z.string().uuid(),
  storageKey: z.string().min(10).max(500),
  mimeType: z.unknown().optional(),
  size: z.unknown().optional(),
  isCover: z.boolean().default(false)
});

export const imageOrderSchema = z.object({
  imageIds: z.array(z.string().uuid()).max(3)
});
