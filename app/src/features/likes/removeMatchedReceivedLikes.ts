import type { InfiniteData, QueryClient, QueryFilters } from '@tanstack/react-query';
import type { Paginated } from '../../types/api';
import type { ReceivedLike } from '../../types/likes';

// Run only after server confirmation. Counts and book filters are refreshed by invalidation.
export async function removeMatchedReceivedLikes(client: QueryClient, otherUserId: string, isCurrentSession: () => boolean) {
  const receivedLists: QueryFilters = {
    queryKey: ['likes', 'received'],
    predicate: query => query.queryKey[2] === 'asc' || query.queryKey[2] === 'desc'
  };
  await client.cancelQueries(receivedLists);
  if (!isCurrentSession()) return false;
  client.setQueriesData<InfiniteData<Paginated<ReceivedLike>>>(receivedLists, previous => previous ? {
    ...previous,
    pages: previous.pages.map(page => ({
      ...page,
      items: page.items.filter(item => item.actor.id !== otherUserId)
    }))
  } : previous);
  return true;
}
