import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ database: null }));
vi.mock('../src/shared/database/prisma.js', () => ({ get prisma() { return state.database; } }));

const { gamificationRepository } = await import('../src/modules/gamification/gamification.repository.js');
const userId = '10000000-0000-4000-8000-000000000001';

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

describe('gamification repository', () => {
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
});
