import { describe, expect, it, vi } from 'vitest';

const { env } = vi.hoisted(() => ({
  env: {
    STORAGE_MODE: 'r2',
    R2_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    R2_BUCKET: 'mybooks-test',
    R2_PRESIGN_EXPIRES_IN: 300,
    R2_PUBLIC_URL: 'https://cdn.example.test'
  }
}));

vi.mock('../src/config/env.js', () => ({ env }));

const { storageService } = await import('../src/modules/media/storage.service.js');

describe('storageService presigned R2 uploads', () => {
  it('signs the book image content type without binding the URL to Content-Length', async () => {
    const upload = await storageService.createPresignedUpload({
      ownerId: 'owner-id',
      bookId: 'book-id',
      imageId: 'image-id',
      mimeType: 'image/jpeg',
      size: 1234
    });

    expect(new URL(upload.uploadUrl).searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host');
    expect(upload.headers).toEqual({ 'Content-Type': 'image/jpeg' });
  });

  it('signs the avatar content type without binding the URL to Content-Length', async () => {
    const upload = await storageService.createPresignedAvatarUpload({
      ownerId: 'owner-id',
      imageId: 'image-id',
      mimeType: 'image/jpeg',
      size: 1234
    });

    expect(new URL(upload.uploadUrl).searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host');
    expect(upload.headers).toEqual({ 'Content-Type': 'image/jpeg' });
  });
});
