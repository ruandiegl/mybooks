import { env } from '../../config/env.js';
export const finalAvatarKey = (userId, imageId) => `avatars/${userId}/${imageId}.jpg`;
export function ownedLegacyAvatarKey(user, publicBase = env.R2_PUBLIC_URL) {
  if (!user?.avatarUrl || !publicBase) return null;
  try {
    const base = new URL(publicBase), url = new URL(user.avatarUrl);
    if (url.origin !== base.origin || url.search || url.hash || url.username || url.password) return null;
    const basePath = base.pathname.replace(/\/$/, '');
    if (!url.pathname.startsWith(basePath + '/')) return null;
    const path = url.pathname.slice(basePath.length + 1), pieces = path.split('/');
    return pieces.length === 3 && pieces[0] === 'avatars' && pieces[1] === user.id &&
      /^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(pieces[2]) ? path : null;
  } catch { return null; }
}
