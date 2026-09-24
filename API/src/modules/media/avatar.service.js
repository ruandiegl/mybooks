import { randomUUID } from 'node:crypto';
import { AppError } from '../../shared/errors/AppError.js';
import { usersRepository } from '../users/users.repository.js';
import { completeUploadSchema, presignSchema } from './media.schemas.js';
import { storageService } from './storage.service.js';

function assertAvatarKey(storageKey, userId, imageId) {
  const segments = storageKey.split('/');
  const exactImage = segments[2]?.match(/^([0-9a-f-]{36})\.(jpg|png|webp)$/i)?.[1];
  if (segments.length !== 3 || segments[0] !== 'avatars' || segments[1] !== userId || exactImage !== imageId) {
    throw new AppError('A chave do avatar não pertence a este usuário.', { statusCode: 403, code: 'AVATAR_KEY_FORBIDDEN' });
  }
}

function ownedStorageKey(url, userId) {
  if (typeof url !== 'string') return null;
  const marker = `/avatars/${userId}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + 1);
}

export const avatarService = {
  async presign(userId, input) {
    const data = presignSchema.parse(input);
    const imageId = randomUUID();
    return { imageId, ...await storageService.createPresignedAvatarUpload({ ownerId: userId, imageId, ...data }) };
  },

  async complete(userId, input) {
    const { isCover: _ignored, ...data } = completeUploadSchema.parse({ ...input, isCover: false });
    assertAvatarKey(data.storageKey, userId, data.imageId);
    await storageService.assertUploaded(data.storageKey, data);
    const user = await usersRepository.findById(userId);
    if (!user) throw new AppError('Perfil não encontrado.', { statusCode: 404, code: 'USER_NOT_FOUND' });
    const avatarUrl = storageService.getPublicUrl(data.storageKey);

    try {
      await usersRepository.update(userId, { avatarUrl });
    } catch (error) {
      await storageService.delete(data.storageKey).catch(() => undefined);
      throw error;
    }

    const previousKey = ownedStorageKey(user.avatarUrl, userId);
    if (previousKey && previousKey !== data.storageKey) await storageService.delete(previousKey).catch(() => undefined);
    return { avatarUrl };
  },

  async delete(userId) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new AppError('Perfil não encontrado.', { statusCode: 404, code: 'USER_NOT_FOUND' });
    await usersRepository.update(userId, { avatarUrl: null });
    const key = ownedStorageKey(user.avatarUrl, userId);
    if (key) await storageService.delete(key).catch(() => undefined);
    return { ok: true };
  }
};
