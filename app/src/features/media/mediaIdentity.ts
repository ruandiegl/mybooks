import type { MediaDescriptor, MediaScope } from './mediaTypes';

export function createBookMedia(scope: MediaScope, bookId: string, photo: { id?: string | null; url: string | null; expiresAt?: string | null }): MediaDescriptor | null {
  const content = photo.id && photo.id !== 'external-cover' ? photo.id : photo.url;
  if (!content || !bookId) return null;
  return { identity: JSON.stringify([scope.userId, scope.epoch, 'book', bookId, content]), url: photo.url, expiresAt: photo.expiresAt ?? null };
}

export function createAvatarMedia(scope: MediaScope, subjectId: string, avatar: { avatarUrl?: string | null; avatarUrlExpiresAt?: string | null; avatarVersion?: number }): MediaDescriptor | null {
  const content = Number.isInteger(avatar.avatarVersion) && (avatar.avatarVersion ?? -1) >= 0 ? avatar.avatarVersion : avatar.avatarUrl;
  if (content == null || !subjectId) return null;
  return { identity: JSON.stringify([scope.userId, scope.epoch, 'avatar', subjectId, content]), url: avatar.avatarUrl ?? null, expiresAt: avatar.avatarUrlExpiresAt ?? null };
}

export function getMediaPixelBucket(size: number, pixelRatio: number): number {
  const pixels = Number.isFinite(size * pixelRatio) ? Math.max(1, size * pixelRatio) : 128;
  return [128, 256, 512, 1024, 1536].find((bucket) => bucket >= pixels) ?? 1536;
}

export function toMediaScope(scope: { userId: string | undefined; epoch: number }): MediaScope | null {
  return scope.userId ? { userId: scope.userId, epoch: scope.epoch } : null;
}

export function isMediaScopeCurrent(scope: MediaScope, current: MediaScope | null): boolean {
  return scope.userId === current?.userId && scope.epoch === current?.epoch;
}
