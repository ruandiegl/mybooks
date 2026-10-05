import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/env.js', () => ({ env: {
  STORAGE_MODE: 'r2', R2_ACCOUNT_ID: 'test-account', R2_ACCESS_KEY_ID: 'test-key',
  R2_SECRET_ACCESS_KEY: 'test-secret', R2_BUCKET: 'private-test',
  R2_PRESIGN_EXPIRES_IN: 300, R2_GET_URL_EXPIRES_IN: 300
} }));
const { storageService } = await import('../src/modules/media/storage.service.js');

describe('avatar S3 authorization', () => {
  it('uploads only to a pending avatar key with headers a browser can send', async () => {
    const grant = await storageService.createPresignedAvatarUpload({
      ownerId: 'user-a', imageId: 'image-a', mimeType: 'image/png', size: 1024
    });
    expect(grant.storageKey).toBe('pending/avatars/user-a/image-a.png');
    const url = new URL(grant.uploadUrl);
    expect(url.hostname).toMatch(/(?:^|\.)test-account\.r2\.cloudflarestorage\.com$/);
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).not.toContain('content-length');
    expect(grant.headers).toEqual({ 'Content-Type': 'image/png' });
  });

  it('retains book staging and avoids binding a manually supplied content length', async () => {
    const grant = await storageService.createPresignedUpload({
      ownerId: 'user-a', bookId: 'book-a', imageId: 'image-a', mimeType: 'image/jpeg', size: 1024
    });
    expect(grant.storageKey).toBe('pending/books/user-a/book-a/image-a.jpg');
    expect(new URL(grant.uploadUrl).searchParams.get('X-Amz-SignedHeaders')).not.toContain('content-length');
  });
});
