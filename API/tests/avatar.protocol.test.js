import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as avatarModule from '../src/modules/media/avatar.service.js';

const id = '30000000-0000-4000-8000-000000000001';
const userId = '10000000-0000-4000-8000-000000000001';
let repository, storage, processor, service, user, grant;
describe('private avatar protocol', () => {
  beforeEach(() => {
    grant = undefined;
    user = { id: userId, avatarStorageKey: 'avatars/old.jpg', avatarVersion: 4, avatarUrl: null };
    repository = {
      createGrant: vi.fn(async (_owner, data) => (grant = { ...data, userId, expectedAvatarVersion: 4 })),
      claim: vi.fn(async (owner, imageId) => {
        if (!grant || owner !== userId || imageId !== id) throw Object.assign(new Error(), { code: 'AVATAR_KEY_FORBIDDEN' });
        if (grant.status === 'COMMITTED') return { alreadyCommitted: true, user };
        if (grant.status === 'PROCESSING') throw Object.assign(new Error(), { code: 'AVATAR_UPLOAD_IN_PROGRESS' });
        grant.status = 'PROCESSING'; return { grant };
      }),
      commit: vi.fn(async () => { grant.status = 'COMMITTED'; user = { ...user, avatarStorageKey: `avatars/${userId}/${id}.jpg`, avatarVersion: 5 }; return user; }),
      expire: vi.fn(async () => { grant.status = 'EXPIRED'; }),
      remove: vi.fn(async () => ({ ...user, avatarStorageKey: null, avatarVersion: 5 }))
    };
    storage = {
      createPresignedAvatarUpload: vi.fn(async () => ({ storageKey: `pending/avatars/${userId}/${id}.png`, uploadUrl: 'https://storage.test/signed', headers: { 'Content-Type': 'image/png' }, expiresIn: 300 })),
      assertUploaded: vi.fn(), readObjectLimited: vi.fn(async () => Buffer.alloc(100)), putImageBuffer: vi.fn(),
      getPresignedGetUrl: vi.fn(async (key) => ({ url: `https://storage.test/${key}`, expiresAt: '2026-10-05T12:05:00Z' }))
    };
    processor = vi.fn(async () => ({ buffer: Buffer.alloc(20), mimeType: 'image/jpeg' }));
    service = avatarModule.createAvatarService?.({ repository, storage, processor, uuid: () => id, clock: () => new Date('2026-10-05T12:00:00Z') });
  });
  it('binds the new presign to cropped dimensions and exposes the supported protocol', async () => {
    const data = await service.presign(userId, { protocolVersion: 2, mimeType: 'image/png', size: 100, width: 512, height: 512 });
    expect(data).toMatchObject({ imageId: id, protocolVersion: 2, expiresAt: '2026-10-05T12:05:00.000Z' });
    expect(grant.size).toBe(100);
    expect(grant.protocolVersion).toBe(2);
  });
  it('rejects a false crop before granting a storage URL', async () => {
    await expect(service.presign(userId, { protocolVersion: 2, mimeType: 'image/png', size: 100, width: 256, height: 512 }))
      .rejects.toMatchObject({ code: 'AVATAR_CROP_INVALID' });
    expect(grant).toBeUndefined();
  });
  it('confirms only the authorized image and retry does not upload or increment twice', async () => {
    await service.presign(userId, { protocolVersion: 2, mimeType: 'image/png', size: 100, width: 512, height: 512 });
    const first = await service.complete(userId, { imageId: id });
    const retry = await service.complete(userId, { imageId: id });
    expect(first.avatarVersion).toBe(5);
    expect(retry).toEqual(first);
    expect(first).not.toHaveProperty('avatarStorageKey');
    expect(storage.putImageBuffer).toHaveBeenCalledTimes(1);
  });
  it('keeps the current avatar when storage validation fails', async () => {
    await service.presign(userId, { protocolVersion: 2, mimeType: 'image/png', size: 100, width: 512, height: 512 });
    storage.assertUploaded.mockRejectedValue(Object.assign(new Error(), { code: 'IMAGE_UPLOAD_MISMATCH', statusCode: 422 }));
    await expect(service.complete(userId, { imageId: id })).rejects.toMatchObject({ code: 'IMAGE_UPLOAD_MISMATCH' });
    expect(user.avatarVersion).toBe(4);
    expect(user.avatarStorageKey).toBe('avatars/old.jpg');
    expect(grant.status).toBe('EXPIRED');
  });
  it('does not consume another user grant or accept a mismatching legacy key', async () => {
    await service.presign(userId, { protocolVersion: 2, mimeType: 'image/png', size: 100, width: 512, height: 512 });
    await expect(service.complete('other', { imageId: id })).rejects.toMatchObject({ code: 'AVATAR_KEY_FORBIDDEN' });
    await expect(service.complete(userId, { imageId: id, storageKey: 'avatars/forged/key.jpg' })).rejects.toMatchObject({ code: 'AVATAR_KEY_FORBIDDEN' });
    expect(user.avatarVersion).toBe(4);
  });
});
