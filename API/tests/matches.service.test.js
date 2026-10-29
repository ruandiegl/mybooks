import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  matchesRepository: { applyInteraction: vi.fn(), remove: vi.fn(), listForUser: vi.fn() },
  likesQuotaService: { consumeDailyLike: vi.fn() }
}));
vi.mock('../src/modules/matches/matches.repository.js', () => ({ matchesRepository: mocks.matchesRepository }));
vi.mock('../src/modules/premium/likesQuota.service.js', () => ({ likesQuotaService: mocks.likesQuotaService }));
const { matchesService } = await import('../src/modules/matches/matches.service.js');
const actorId = '10000000-0000-4000-8000-000000000001';
const ownerId = '20000000-0000-4000-8000-000000000002';
const bookId = '30000000-0000-4000-8000-000000000003';
const clientActionId = '40000000-0000-4000-8000-000000000004';
const input = { targetBookId: bookId, action: 'LIKE', clientActionId };
const transaction = { transactionId: 'same-transaction' };

describe('matchesService', () => {
  beforeEach(() => {
    mocks.matchesRepository.applyInteraction.mockReset().mockResolvedValue({
      interaction: { id: 'interaction', action: 'LIKE', targetBookId: bookId, createdAt: new Date() },
      match: null
    });
    mocks.likesQuotaService.consumeDailyLike.mockReset().mockResolvedValue(undefined);
  });

  it('charges a LIKE inside the interaction and receipt transaction', async () => {
    await matchesService.interact(actorId, input);

    expect(mocks.matchesRepository.applyInteraction).toHaveBeenCalledWith({ actorId, ...input }, expect.any(Function));
    await mocks.matchesRepository.applyInteraction.mock.calls[0][1](transaction);
    expect(mocks.likesQuotaService.consumeDailyLike).toHaveBeenCalledWith(
      actorId, bookId, expect.any(Function), transaction
    );
  });

  it('does not consume a daily like when the action is PASS', async () => {
    await matchesService.interact(actorId, { ...input, action: 'PASS' });

    expect(mocks.matchesRepository.applyInteraction).toHaveBeenCalledWith({ actorId, ...input, action: 'PASS' }, null);
    expect(mocks.likesQuotaService.consumeDailyLike).not.toHaveBeenCalled();
  });

  it('preserves the HTTP match DTO and serializes the other user avatar', async () => {
    mocks.matchesRepository.applyInteraction.mockResolvedValue({
      interaction: { id: 'interaction', action: 'LIKE', targetBookId: bookId, createdAt: new Date() },
      match: { id: 'match', userAId: actorId, userBId: ownerId, userA: { id: actorId }, userB: { id: ownerId, name: 'Bia' }, conversation: { id: 'conversation' }, status: 'ACTIVE' }
    });
    const result = await matchesService.interact(actorId, input);
    expect(result).toMatchObject({ interaction: { id: 'interaction', action: 'LIKE', targetBookId: bookId }, match: { conversationId: 'conversation', otherUser: { id: ownerId } } });
  });

  it('validates actions before persistence', async () => {
    await expect(matchesService.interact(actorId, { ...input, clientActionId: 'bad' })).rejects.toThrow();
    expect(mocks.matchesRepository.applyInteraction).not.toHaveBeenCalled();
  });

  it('validates match UUID before removal', async () => {
    await expect(matchesService.remove(actorId, 'bad')).rejects.toThrow();
    expect(mocks.matchesRepository.remove).not.toHaveBeenCalled();
  });
});
