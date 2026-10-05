import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
export const avatarPresignSchema = z.object({
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']), size: z.number().int().positive().max(8 * 1024 * 1024),
  width: z.number().int().positive().optional(), height: z.number().int().positive().optional(),
  protocolVersion: z.union([z.literal(1), z.literal(2)]).default(1)
}).strict();
export const avatarCompleteSchema = z.object({
  imageId: z.string().uuid(), storageKey: z.string().optional(), mimeType: z.string().optional(), size: z.number().int().positive().optional()
}).strict();
export function validateAvatarPresign(input) {
  if (!['image/png','image/jpeg','image/webp'].includes(input?.mimeType)) throw new AppError('Escolha JPEG, PNG ou WebP.', { statusCode: 422, code: 'IMAGE_TYPE_INVALID' });
  const result = avatarPresignSchema.safeParse(input);
  if (!result.success) throw new AppError('Escolha uma imagem válida dentro do limite.', { statusCode: 422, code: 'IMAGE_SIZE_INVALID' });
  const data = result.data;
  if (data.protocolVersion === 2 && (data.mimeType !== 'image/png' || data.width !== 512 || data.height !== 512)) throw new AppError('A foto precisa ser ajustada antes do envio.', { statusCode: 422, code: 'AVATAR_CROP_INVALID' });
  if (data.protocolVersion === 2 && data.size > 2 * 1024 * 1024) throw new AppError('O recorte excede 2 MB.', { statusCode: 422, code: 'IMAGE_SIZE_INVALID' });
  return data;
}
