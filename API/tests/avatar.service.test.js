import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  usersRepository: { findById: vi.fn(), update: vi.fn() },
  storageService: { createPresignedAvatarUpload: vi.fn(), assertUploaded: vi.fn(), getPublicUrl: vi.fn(), delete: vi.fn() }
}));

vi.mock('../src/modules/users/users.repository.js', () => ({ usersRepository: mocks.usersRepository }));
vi.mock('../src/modules/media/storage.service.js', () => ({ storageService: mocks.storageService }));
const { avatarService } = await import('../src/modules/media/avatar.service.js');

const userId = '10000000-0000-4000-8000-000000000001';
const imageId = '30000000-0000-4000-8000-000000000003';

describe('avatarService', () => {
  beforeEach(() => {
    mocks.usersRepository.findById.mockResolvedValue({ id: userId, avatarUrl: null });
    mocks.usersRepository.update.mockImplementation(async (_id, data) => ({ id: userId, ...data }));
    mocks.storageService.getPublicUrl.mockReturnValue(`https://cdn.example/avatars/${userId}/${imageId}.jpg`);
  });

  it('uses a server-owned avatar key and validates the uploaded object', async () => {
    mocks.storageService.createPresignedAvatarUpload.mockImplementation(async ({ imageId: generatedId }) => ({ storageKey: `avatars/${userId}/${generatedId}.jpg`, uploadUrl: 'signed' }));
    const presign = await avatarService.presign(userId, { mimeType: 'image/jpeg', size: 1024 });
    const result = await avatarService.complete(userId, { imageId: presign.imageId, storageKey: presign.storageKey, mimeType: 'image/jpeg', size: 1024 });

    expect(presign.storageKey).toMatch(new RegExp(`^avatars/${userId}/`));
    expect(mocks.storageService.assertUploaded).toHaveBeenCalledWith(presign.storageKey, expect.objectContaining({ size: 1024 }));
    expect(mocks.usersRepository.update).toHaveBeenCalledWith(userId, { avatarUrl: result.avatarUrl });
  });

  it('rejects a key owned by another user before touching storage', async () => {
    await expect(avatarService.complete(userId, {
      imageId,
      storageKey: `avatars/other-user/${imageId}.jpg`,
      mimeType: 'image/jpeg',
      size: 1024
    })).rejects.toMatchObject({ code: 'AVATAR_KEY_FORBIDDEN' });
    expect(mocks.storageService.assertUploaded).not.toHaveBeenCalled();
  });
});
