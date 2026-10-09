import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { getBookGalleryPhotos } from '../books/bookPresentation';
import { createAvatarMedia, createBookMedia } from './mediaIdentity';
import { prefetchMedia } from './mediaPrefetch';
import type { Book } from '../../types/api';
import type { MediaRequest, MediaScope } from './mediaTypes';

export function useDiscoverMediaPrefetch({ books, focused, scope, getScope }: { books: Book[]; focused: boolean; scope: MediaScope | null; getScope: () => MediaScope | null }) {
  const [foreground, setForeground] = useState(() => Platform.OS === 'web' ? typeof document !== 'undefined' && document.visibilityState !== 'hidden' : AppState.currentState === 'active');
  useEffect(() => {
    if (Platform.OS === 'web') {
      const update = () => setForeground(document.visibilityState !== 'hidden');
      document.addEventListener('visibilitychange', update);
      return () => document.removeEventListener('visibilitychange', update);
    }
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  const requests: MediaRequest[] = [];
  if (scope) for (const book of books.slice(1, 3)) {
    const photo = getBookGalleryPhotos(book)[0];
    const cover = photo ? createBookMedia(scope, book.id, photo) : null;
    if (cover?.url) requests.push({ media: cover, pixelBucket: 1024 });
    const avatar = book.owner?.id ? createAvatarMedia(scope, book.owner.id, book.owner) : null;
    if (avatar?.url) requests.push({ media: avatar, pixelBucket: 256 });
  }
  const signature = JSON.stringify(requests.map(request => [request.media.identity, request.media.url, request.media.expiresAt]));
  useEffect(() => {
    if (!focused || !foreground || !scope) return;
    return prefetchMedia(requests, scope, getScope);
  }, [focused, foreground, scope?.userId, scope?.epoch, signature, getScope]);
}
