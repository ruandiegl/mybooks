import { Platform } from 'react-native';

const keyFor = (userId: string) => `trocalivros:discover:current-book:${userId}`;

export function readDiscoverBookId(userId: string | undefined) {
  if (!userId || Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try { return window.sessionStorage.getItem(keyFor(userId)); }
  catch { return null; }
}

export function saveDiscoverBookId(userId: string | undefined, bookId: string | null) {
  if (!userId || Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    if (bookId) window.sessionStorage.setItem(keyFor(userId), bookId);
    else window.sessionStorage.removeItem(keyFor(userId));
  } catch { /* Private browsing may refuse session storage. */ }
}
