import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { avatarCompleteSchema, validateAvatarPresign } from './avatar.schemas.js';
import { avatarRepository } from './avatar.repository.js';
import { normalizeAvatar } from './avatarProcessing.service.js';
import { serializeAvatar } from './avatar.serializer.js';
import { finalAvatarKey } from './avatar.keys.js';
import { storageService } from './storage.service.js';

export function createAvatarService({ repository = avatarRepository, storage = storageService, processor = normalizeAvatar, uuid = randomUUID, clock = () => new Date() } = {}) {
  return {
    async presign(userId, input) {
      const data = validateAvatarPresign(input), imageId = uuid();
      const presign = await storage.createPresignedAvatarUpload({ ownerId: userId, imageId, mimeType: data.mimeType, size: data.size });
      const expiresAt = new Date(clock().getTime() + (presign.expiresIn ?? env.R2_PRESIGN_EXPIRES_IN) * 1000);
      await repository.createGrant(userId, { id: imageId, storageKey: presign.storageKey, mimeType: data.mimeType, size: data.size, protocolVersion: data.protocolVersion, expiresAt });
      return { imageId, ...presign, expiresAt: expiresAt.toISOString(), protocolVersion: data.protocolVersion };
    },
    async complete(userId, input) {
      const data = avatarCompleteSchema.parse(input);
      const claimed = await repository.claim(userId, data.imageId, clock());
      if (claimed.alreadyCommitted) return serializeAvatar(claimed.user, new Map(), storage);
      const grant = claimed.grant;
      try {
        if (data.storageKey !== undefined && data.storageKey !== grant.storageKey) throw new AppError('A chave não pertence ao envio autorizado.', { statusCode: 403, code: 'AVATAR_KEY_FORBIDDEN' });
        if ((data.mimeType !== undefined && data.mimeType !== grant.mimeType) || (data.size !== undefined && data.size !== grant.size)) throw new AppError('O arquivo difere do envio autorizado.', { statusCode: 422, code: 'IMAGE_UPLOAD_MISMATCH' });
        await storage.assertUploaded(grant.storageKey, grant);
        const bytes = await storage.readObjectLimited(grant.storageKey, grant.size);
        const normalized = await processor(bytes, grant);
        await storage.putImageBuffer(finalAvatarKey(userId, grant.id), normalized.buffer, normalized.mimeType);
        const user = await repository.commit(userId, grant, clock());
        return serializeAvatar(user, new Map(), storage);
      } catch (error) {
        await repository.expire(userId, grant.id).catch(() => undefined);
        if (error instanceof AppError || error?.statusCode) throw error;
        throw new AppError('Não foi possível confirmar a foto. Tente novamente.', { statusCode: 503, code: 'AVATAR_STORAGE_UNAVAILABLE' });
      }
    },
    async delete(userId) { return serializeAvatar(await repository.remove(userId), new Map(), storage); }
  };
}
export const avatarService = createAvatarService();
