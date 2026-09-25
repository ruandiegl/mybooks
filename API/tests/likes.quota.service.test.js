import { describe, expect, it, vi } from 'vitest';
import { createLikesQuotaService, getSaoPauloQuotaDate } from '../src/modules/premium/likesQuota.service.js';

const userId = '10000000-0000-4000-8000-000000000001';
const bookId = '20000000-0000-4000-8000-000000000002';
const today = new Date('2026-09-24T12:00:00.000Z');

function setup({ used = 0, existing = false, premiumActive = false, now = today, repositoryOverrides = {} } = {}) {
  const tx = { transactionId: 'quota-transaction' };
  const clock = { now: vi.fn(() => new Date(now)) };
  const repository = {
    withUserTransaction: vi.fn(async (_userId, operation) => operation(tx)),
    deleteOlderUsage: vi.fn(),
    findUsage: vi.fn().mockResolvedValue(existing ? { id: 'existing-usage' } : null),
    countUsage: vi.fn().mockResolvedValue(used),
    createUsage: vi.fn().mockResolvedValue({ id: 'usage' }),
    ...repositoryOverrides
  };
  const premium = { hasActiveTrial: vi.fn().mockResolvedValue(premiumActive) };
  const service = createLikesQuotaService({ repository, premium, clock });
  return { service, repository, premium, tx, clock };
}

describe('likesQuotaService', () => {
  it('uses the Sao Paulo civil date across UTC midnight', () => {
    expect(getSaoPauloQuotaDate(new Date('2026-09-25T02:59:59.000Z')).toISOString())
      .toBe('2026-09-24T00:00:00.000Z');
    expect(getSaoPauloQuotaDate(new Date('2026-09-25T03:00:00.000Z')).toISOString())
      .toBe('2026-09-25T00:00:00.000Z');
  });

  it('creates quota and persists the interaction through the same locked transaction', async () => {
    const { service, repository, premium, tx, clock } = setup({ used: 14 });
    const persist = vi.fn(async (receivedTx) => ({ tx: receivedTx }));

    await expect(service.consumeDailyLike(userId, bookId, persist)).resolves.toEqual({ tx });
    expect(repository.withUserTransaction).toHaveBeenCalledWith(userId, expect.any(Function));
    expect(premium.hasActiveTrial).toHaveBeenCalledWith(userId, today, tx);
    expect(clock.now).toHaveBeenCalledOnce();
    expect(repository.deleteOlderUsage).toHaveBeenCalledWith(tx, userId, expect.any(Date));
    expect(repository.createUsage).toHaveBeenCalledWith(tx, {
      userId,
      targetBookId: bookId,
      quotaDate: expect.any(Date)
    });
    expect(persist).toHaveBeenCalledWith(tx);
  });

  it('rejects a sixteenth distinct free like without persisting usage or interaction', async () => {
    const { service, repository } = setup({ used: 15 });
    const persist = vi.fn();

    await expect(service.consumeDailyLike(userId, bookId, persist)).rejects.toMatchObject({
      statusCode: 403,
      code: 'DAILY_LIKE_LIMIT_REACHED'
    });
    expect(repository.createUsage).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it('allows retrying a book already counted for the day without a second usage row', async () => {
    const { service, repository, tx } = setup({ used: 15, existing: true });
    const persist = vi.fn(async () => 'interaction');

    await expect(service.consumeDailyLike(userId, bookId, persist)).resolves.toBe('interaction');
    expect(repository.createUsage).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledWith(tx);
  });

  it('records premium likes too so expiry cannot grant a second daily quota', async () => {
    const { service, repository, premium } = setup({ used: 15, premiumActive: true });

    await service.consumeDailyLike(userId, bookId, vi.fn());
    expect(premium.hasActiveTrial).toHaveBeenCalledOnce();
    expect(repository.createUsage).toHaveBeenCalledOnce();
  });

  it('reads server time after acquiring the user lock at the Sao Paulo day boundary', async () => {
    const afterMidnight = new Date('2026-09-25T03:00:00.000Z');
    const clock = { now: vi.fn(() => new Date(today)) };
    const tx = { transactionId: 'locked' };
    const repository = {
      withUserTransaction: vi.fn(async (_userId, operation) => {
        clock.now.mockReturnValue(afterMidnight);
        return operation(tx);
      }),
      deleteOlderUsage: vi.fn(),
      findUsage: vi.fn().mockResolvedValue(null),
      countUsage: vi.fn().mockResolvedValue(0),
      createUsage: vi.fn()
    };
    const premium = { hasActiveTrial: vi.fn().mockResolvedValue(false) };
    const service = createLikesQuotaService({ repository, premium, clock });

    await service.consumeDailyLike(userId, bookId, vi.fn());

    expect(premium.hasActiveTrial).toHaveBeenCalledWith(userId, afterMidnight, tx);
    expect(repository.deleteOlderUsage).toHaveBeenCalledWith(tx, userId, new Date('2026-09-25T00:00:00.000Z'));
  });
});
