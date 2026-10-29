import { api } from '../../services/api';
import type { ApiEnvelope, GamificationLeaderboard } from '../../types/api';

export const GAMIFICATION_LEADERBOARD_QUERY_KEY = ['gamification', 'leaderboard'] as const;

export const gamificationApi = {
  async getLeaderboard(): Promise<GamificationLeaderboard> {
    const response = await api.get<ApiEnvelope<GamificationLeaderboard>>('/api/v1/gamification/leaderboard');
    return response.data.data;
  }
};
