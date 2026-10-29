import { describe, expect, it } from 'vitest';
import { presentLeaderboard } from '../presentation';
import type { GamificationLeaderboard } from '../../../types/api';

function publicEntry(name: string, currentStreak: number, rank: number) {
  return { name, avatarUrl: null, avatarUrlExpiresAt: null, currentStreak, rank };
}

describe('leaderboard presentation', () => {
  it('preserves competition ranks 1, 1, 3 and a current user outside the top 20', () => {
    const result = presentLeaderboard({
      currentUser: { currentStreak: 1, rank: 23 },
      entries: [publicEntry('Ana', 12, 1), publicEntry('Bia', 12, 1), publicEntry('Caio', 8, 3)]
    });

    expect(result.currentUser.rankLabel).toBe('23º lugar');
    expect(result.entries.map(({ rank }) => rank)).toEqual([1, 1, 3]);
  });

  it('keeps every entry tied at the rank 20 cutoff', () => {
    const entries = Array.from({ length: 19 }, (_, index) => publicEntry(`Reader ${index}`, 100 - index, index + 1));
    entries.push(publicEntry('Tied A', 10, 20), publicEntry('Tied B', 10, 20));

    const result = presentLeaderboard({ currentUser: { currentStreak: 0, rank: null }, entries });

    expect(result.entries).toHaveLength(21);
    expect(result.entries.filter(({ rank }) => rank === 20)).toHaveLength(2);
    expect(result.currentUser).toMatchObject({ currentStreak: 0, rank: null, rankLabel: 'Sem posição ainda' });
  });

  it('keeps the signed avatar expiration needed for renewal', () => {
    const expiresAt = '2026-10-29T12:00:30.000Z';
    const result = presentLeaderboard({
      currentUser: { currentStreak: 1, rank: 1 },
      entries: [{ ...publicEntry('Ana', 1, 1), avatarUrl: 'https://signed.test/ana', avatarUrlExpiresAt: expiresAt }]
    });

    expect(result.entries[0]).toMatchObject({ avatarUrl: 'https://signed.test/ana', avatarUrlExpiresAt: expiresAt });
  });

  it('projects only public fields and supports an empty ranking', () => {
    const input = {
      currentUser: { currentStreak: 1, rank: 1, email: 'private@example.test' },
      entries: [{ ...publicEntry('Reader', 1, 1), phone: '11999999999', lastActiveDay: '2026-10-26' }]
    } as unknown as GamificationLeaderboard;

    const result = presentLeaderboard(input);
    expect(result.entries[0]).toEqual({
      name: 'Reader', avatarUrl: null, avatarUrlExpiresAt: null, currentStreak: 1, rank: 1, rankLabel: '1º'
    });
    expect(JSON.stringify(result)).not.toMatch(/email|phone|lastActiveDay/i);
    expect(presentLeaderboard({ currentUser: { currentStreak: 0, rank: null }, entries: [] }).entries).toEqual([]);
  });
});
