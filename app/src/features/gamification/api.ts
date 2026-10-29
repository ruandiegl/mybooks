import { api } from '../../services/api';
import type { ApiEnvelope, GamificationLeaderboard } from '../../types/api';

export const GAMIFICATION_LEADERBOARD_QUERY_KEY = ['gamification', 'leaderboard'] as const;
export const GAMIFICATION_LEADERBOARD_MATCHES_QUERY_KEY = ['gamification', 'leaderboard', 'matches'] as const;
export type LeaderboardScope = 'global' | 'matches';

export const gamificationApi = {
  async getLeaderboard(scope: LeaderboardScope = 'global'): Promise<GamificationLeaderboard> {
    const response = await api.get<ApiEnvelope<GamificationLeaderboard>>(
      '/api/v1/gamification/leaderboard',
      scope === 'matches' ? { params: { scope } } : undefined
    );
    return response.data.data;
  }
};
