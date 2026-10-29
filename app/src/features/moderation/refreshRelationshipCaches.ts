import type { QueryClient } from '@tanstack/react-query';

const sensitiveKeys = [
  ['books', 'discover'], ['book'], ['exchange-book'], ['likes'],
  ['matches'], ['conversations'], ['messages'], ['public-profile']
];

export async function refreshRelationshipCaches(queryClient: QueryClient) {
  await Promise.all(sensitiveKeys.map(queryKey => queryClient.resetQueries({ queryKey })));
  await Promise.all([['blocked-users'], ['me']].map(queryKey => queryClient.invalidateQueries({ queryKey })));
}
