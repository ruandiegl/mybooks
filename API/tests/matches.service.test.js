import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  booksRepository: { findById: vi.fn() },
  matchesRepository: { upsertInteraction: vi.fn(), findReverseLike: vi.fn(), createMatch: vi.fn(), listForUser: vi.fn() },
  likesQuotaService: { consumeDailyLike: vi.fn() }
}));

vi.mock('../src/modules/books/books.repository.js', () => ({ booksRepository: mocks.booksRepository }));
vi.mock('../src/modules/matches/matches.repository.js', () => ({ matchesRepository: mocks.matchesRepository }));
vi.mock('../src/modules/premium/likesQuota.service.js', () => ({ likesQuotaService: mocks.likesQuotaService }));

const { matchesService } = await import('../src/modules/matches/matches.service.js');

const actorId = '10000000-0000-4000-8000-000000000001';
const ownerId = '20000000-0000-4000-8000-000000000002';
const bookId = '30000000-0000-4000-8000-000000000003';
const clientActionId = '40000000-0000-4000-8000-000000000004';

describe('matchesService', () => {
  beforeEach(() => {
    mocks.booksRepository.findById.mockResolvedValue({ id: bookId, ownerId, availability: 'AVAILABLE' });
    mocks.likesQuotaService.consumeDailyLike.mockImplementation((_actorId, _bookId, persistInteraction) => persistInteraction({ transactionId: 'same-transaction' }));
    mocks.matchesRepository.upsertInteraction.mockResolvedValue({ id: 'interaction', action: 'LIKE', targetBookId: bookId, createdAt: new Date() });
  });

  it('persists a LIKE inside the same transaction that consumes its daily quota', async () => {
    await matchesService.interact(actorId, { targetBookId: bookId, action: 'LIKE', clientActionId });

    expect(mocks.likesQuotaService.consumeDailyLike).toHaveBeenCalledWith(
      actorId,
      bookId,
      expect.any(Function)
    );
    expect(mocks.matchesRepository.upsertInteraction).toHaveBeenCalledWith(
      { actorId, targetBookId: bookId, action: 'LIKE', clientActionId },
      { transactionId: 'same-transaction' }
    );
  });

  it('does not consume a daily like when the action is PASS', async () => {
    await matchesService.interact(actorId, { targetBookId: bookId, action: 'PASS', clientActionId });

    expect(mocks.likesQuotaService.consumeDailyLike).not.toHaveBeenCalled();
  });

  it('cria match e conversa somente quando existe curtida reversa', async () => {
    mocks.matchesRepository.findReverseLike.mockResolvedValue({ id: 'reverse' });
    mocks.matchesRepository.createMatch.mockResolvedValue({
      id: 'match',
      userAId: actorId,
      userBId: ownerId,
      userA: { id: actorId, name: 'Ana' },
      userB: { id: ownerId, name: 'Bia' },
      conversation: { id: 'conversation' },
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await matchesService.interact(actorId, { targetBookId: bookId, action: 'LIKE', clientActionId });

    expect(mocks.matchesRepository.createMatch).toHaveBeenCalledWith(actorId, ownerId);
    expect(result.match).toMatchObject({ conversationId: 'conversation', otherUser: { id: ownerId } });
  });

  it('não cria match ao passar um livro', async () => {
    mocks.matchesRepository.upsertInteraction.mockResolvedValue({ id: 'interaction', action: 'PASS', targetBookId: bookId, createdAt: new Date() });

    const result = await matchesService.interact(actorId, { targetBookId: bookId, action: 'PASS', clientActionId });

    expect(mocks.matchesRepository.findReverseLike).not.toHaveBeenCalled();
    expect(mocks.matchesRepository.createMatch).not.toHaveBeenCalled();
    expect(result.match).toBeNull();
  });

  it('rejeita interação com o próprio livro', async () => {
    mocks.booksRepository.findById.mockResolvedValue({ id: bookId, ownerId: actorId, availability: 'AVAILABLE' });

    await expect(matchesService.interact(actorId, { targetBookId: bookId, action: 'LIKE', clientActionId })).rejects.toMatchObject({ code: 'SELF_INTERACTION' });
    expect(mocks.matchesRepository.upsertInteraction).not.toHaveBeenCalled();
  });
});
