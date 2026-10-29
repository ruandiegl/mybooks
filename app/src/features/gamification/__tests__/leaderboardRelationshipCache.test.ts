import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { refreshRelationshipCaches } from '../../moderation/refreshRelationshipCaches';
import { GAMIFICATION_LEADERBOARD_MATCHES_QUERY_KEY, GAMIFICATION_LEADERBOARD_QUERY_KEY } from '../api';

describe('match leaderboard cache', () => {
  it('removes a blocked or unblocked relationship from the match ranking without disturbing the global ranking', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(GAMIFICATION_LEADERBOARD_QUERY_KEY, { entries: ['global'] });
    client.setQueryData(GAMIFICATION_LEADERBOARD_MATCHES_QUERY_KEY, { entries: ['match'] });

    await refreshRelationshipCaches(client);

    expect(client.getQueryData(GAMIFICATION_LEADERBOARD_MATCHES_QUERY_KEY)).toBeUndefined();
    expect(client.getQueryData(GAMIFICATION_LEADERBOARD_QUERY_KEY)).toEqual({ entries: ['global'] });
    client.clear();
  });
});
