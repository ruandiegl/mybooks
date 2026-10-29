import type { GamificationLeaderboard } from '../../types/api';

export type LeaderboardPresentation = {
  currentUser: {
    currentStreak: number;
    rank: number | null;
    rankLabel: string;
  };
  entries: Array<{
    name: string;
    avatarUrl: string | null;
    currentStreak: number;
    rank: number;
    rankLabel: string;
  }>;
};

function rankLabel(rank: number | null, includePlace = false): string {
  if (rank === null) return 'Sem posição ainda';
  return includePlace ? `${rank}º lugar` : `${rank}º`;
}

export function presentLeaderboard(data: GamificationLeaderboard): LeaderboardPresentation {
  return {
    currentUser: {
      currentStreak: data.currentUser.currentStreak,
      rank: data.currentUser.rank,
      rankLabel: rankLabel(data.currentUser.rank, true)
    },
    entries: data.entries.map((entry) => ({
      name: entry.name,
      avatarUrl: entry.avatarUrl,
      currentStreak: entry.currentStreak,
      rank: entry.rank,
      rankLabel: rankLabel(entry.rank)
    }))
  };
}
