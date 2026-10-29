import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ database: null, sign: vi.fn() }));
vi.mock('../src/shared/database/prisma.js', () => ({ get prisma() { return state.database; } }));
vi.mock('../src/modules/media/storage.service.js', () => ({ storageService: { getPresignedGetUrl: state.sign } }));

const { gamificationRepository } = await import('../src/modules/gamification/gamification.repository.js');
const userId = '10000000-0000-4000-8000-000000000001';

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

describe('gamification repository', () => {
  it('signs private avatars and assigns competition ranks in one pass, including the rank-20 tie', async () => {
    state.sign.mockReset().mockResolvedValue({ url: 'https://example.test/signed', expiresAt: '2026-10-28T12:00:00.000Z' });
    const leaders = Array.from({ length: 19 }, (_, index) => ({
      id: `leader-${index}`, name: `Leader ${index}`, avatarStorageKey: null,
      avatarVersion: 0, avatarUrl: null, currentActiveStreak: 100 - index
    }));
    const tied = Array.from({ length: 3 }, (_, index) => ({
      id: `tied-${index}`, name: `Tied ${index}`, avatarStorageKey: 'private/avatar',
      avatarVersion: 3, avatarUrl: null, currentActiveStreak: 10
    }));
    const findMany = vi.fn().mockResolvedValueOnce([...leaders, tied[0]]).mockResolvedValueOnce([...leaders, ...tied]);
    const tx = { user: {
      findUnique: vi.fn().mockResolvedValue({ lastActiveDay: new Date('2026-10-28T00:00:00.000Z'), currentActiveStreak: 1 }),
      count: vi.fn().mockResolvedValue(22),
      findMany
    } };
    state.database = { $transaction: vi.fn((callback) => callback(tx)) };

    const result = await gamificationRepository.listLeaderboard({ currentUserId: userId, today: '2026-10-28' });

    expect(result.currentUser).toEqual({ currentStreak: 1, rank: 23 });
    expect(result.entries).toHaveLength(22);
    expect(result.entries.map(({ rank }) => rank)).toEqual([...Array.from({ length: 19 }, (_, index) => index + 1), 20, 20, 20]);
    expect(result.entries.at(-1)).toMatchObject({
      name: 'Tied 2', avatarUrl: 'https://example.test/signed',
      avatarUrlExpiresAt: '2026-10-28T12:00:00.000Z', avatarVersion: 3
    });
    expect(state.sign).toHaveBeenCalledExactlyOnceWith('private/avatar');
    expect(JSON.stringify(result)).not.toContain('avatarStorageKey');
    expect(JSON.stringify(result)).not.toContain('private/avatar');
    expect(findMany).toHaveBeenCalledTimes(2);
    for (const [query] of findMany.mock.calls) {
      expect(query.select).toMatchObject({ avatarStorageKey: true, avatarVersion: true, avatarUrl: true });
    }
  });

  it('determines the Sao Paulo day only after acquiring the user row lock', async () => {
    const lockRequested = deferred();
    const releaseLock = deferred();
    const clock = vi.fn(() => new Date('2026-10-27T03:00:00.000Z'));
    const tx = {
      $queryRaw: vi.fn(async () => {
        lockRequested.resolve();
        await releaseLock.promise;
        return [{ id: userId }];
      }),
      user: {
        findUnique: vi.fn().mockResolvedValue({
          lastActiveDay: new Date('2026-10-26T00:00:00.000Z'),
          currentActiveStreak: 5
        }),
        update: vi.fn().mockResolvedValue(undefined)
      }
    };
    state.database = {
      $transaction: vi.fn((callback) => callback(tx))
    };

    const checkIn = gamificationRepository.recordCheckIn(userId, clock);
    await lockRequested.promise;
    expect(clock).not.toHaveBeenCalled();

    releaseLock.resolve();
    await expect(checkIn).resolves.toEqual({
      dayKey: '2026-10-27',
      currentStreak: 6,
      checkedInToday: true
    });
    expect(clock).toHaveBeenCalledOnce();
  });

  it('returns no comparison rank when the viewer has no visible active match', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const tx = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ lastActiveDay: new Date('2026-10-29T00:00:00.000Z'), currentActiveStreak: 4 }),
        findMany,
        count: vi.fn().mockResolvedValue(0)
      },
      match: { findFirst: vi.fn().mockResolvedValue(null) }
    };
    state.database = { $transaction: vi.fn(callback => callback(tx)) };

    const result = await gamificationRepository.listLeaderboard({ currentUserId: userId, today: '2026-10-29', scope: 'matches' });
    expect(result).toEqual({ currentUser: { currentStreak: 4, rank: null }, entries: [] });
    expect(findMany).not.toHaveBeenCalled();
  });
});
