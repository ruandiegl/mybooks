import { storageService } from './storage.service.js';
export async function serializeAvatar(user, cache = new Map(), storage = storageService) {
  const avatarVersion = user?.avatarVersion ?? 0;
  if (!user?.avatarStorageKey) return { avatarUrl: user?.avatarUrl ?? null, avatarUrlExpiresAt: null, avatarVersion };
  if (!cache.has(user.avatarStorageKey)) cache.set(user.avatarStorageKey, storage.getPresignedGetUrl(user.avatarStorageKey).catch(() => null));
  const signed = await cache.get(user.avatarStorageKey);
  return { avatarUrl: signed?.url ?? null, avatarUrlExpiresAt: signed?.expiresAt ?? null, avatarVersion };
}
export async function serializeAvatarUser(user, cache, includeCity = true) {
  if (!user) return null;
  return { id: user.id, name: user.name, ...(includeCity ? { city: user.city ?? null } : {}), ...await serializeAvatar(user, cache) };
}
