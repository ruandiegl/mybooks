import { createMediaPrefetchQueue } from './mediaPrefetchQueue';
import { warmMediaUrl } from './warmMediaUrl';
import type { MediaRequest, MediaScope } from './mediaTypes';
const queue = createMediaPrefetchQueue(warmMediaUrl);
export function prefetchMedia(requests: MediaRequest[], scope: MediaScope, getScope: () => MediaScope | null): () => void {
  return queue.enqueue(requests, scope, getScope);
}
export async function disposeMediaScope(scope: MediaScope): Promise<void> {
  queue.dispose(scope);
  // Do not globally clear the loader cache: an older cleanup could evict B.
  // The loader owns its URI/memory cache; references and authority stay scoped.
}
export const getMediaPrefetchSnapshot = () => queue.snapshot();
