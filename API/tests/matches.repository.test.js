import { beforeEach, describe, expect, it, vi } from 'vitest';
const { prisma } = vi.hoisted(() => ({ prisma: { $transaction: vi.fn() } }));
vi.mock('../src/shared/database/prisma.js', () => ({ prisma }));
const { matchesRepository } = await import('../src/modules/matches/matches.repository.js');
const a = '10000000-0000-4000-8000-000000000001';
const b = '20000000-0000-4000-8000-000000000002';
const action = { actorId: b, targetBookId: 'bookA', action: 'LIKE', clientActionId: 'action1' };
let tx;
beforeEach(() => {
  tx = {
    book: { findUnique: vi.fn().mockResolvedValue({ id: 'bookA', ownerId: a, availability: 'AVAILABLE' }) },
    interactionActionReceipt: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    interaction: {
      upsert: vi.fn().mockResolvedValue({ id: 'interaction', ...action }),
      findUnique: vi.fn().mockResolvedValue({ id: 'interaction', ...action, action: 'PASS' }),
      findFirst: vi.fn().mockResolvedValue({ actorId: a, targetBookId: 'bookB', action: 'LIKE' }),
      updateMany: vi.fn()
    },
    match: {
      upsert: vi.fn().mockResolvedValue({ id: 'match' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'match', userAId: a, userBId: b, conversation: { id: 'conversation' } }),
      delete: vi.fn()
    },
    conversation: { upsert: vi.fn() }
  };
  prisma.$transaction.mockReset().mockImplementation(async (callback) => callback(tx));
});
describe('atomic interactions', () => {
  it('charges only a new LIKE inside the receipt transaction', async () => {
    const consumeLike = vi.fn();
    await matchesRepository.applyInteraction(action, consumeLike);
    expect(consumeLike).toHaveBeenCalledExactlyOnceWith(tx);
    expect(tx.interactionActionReceipt.create).toHaveBeenCalledOnce();

    consumeLike.mockClear();
    tx.interactionActionReceipt.findUnique.mockResolvedValue(action);
    await matchesRepository.applyInteraction(action, consumeLike);
    expect(consumeLike).not.toHaveBeenCalled();

    tx.interactionActionReceipt.findUnique.mockResolvedValue(null);
    await matchesRepository.applyInteraction({ ...action, action: 'PASS' }, consumeLike);
    expect(consumeLike).not.toHaveBeenCalled();
  });
  it('replay does not restore a removed like', async () => {
    tx.interactionActionReceipt.findUnique.mockResolvedValue(action);
    const result = await matchesRepository.applyInteraction(action);
    expect(result.interaction.action).toBe('PASS');
    expect(result.match).toBeNull();
    expect(tx.interaction.upsert).not.toHaveBeenCalled();
    expect(tx.match.upsert).not.toHaveBeenCalled();
  });
  it('replays a LIKE with its active match when the target book becomes unavailable', async () => {
    tx.interactionActionReceipt.findUnique.mockResolvedValue(action);
    tx.interaction.findUnique.mockResolvedValue({ id: 'interaction', ...action });
    tx.book.findUnique.mockResolvedValue({ id: 'bookA', ownerId: a, availability: 'EXCHANGED' });
    const activeMatch = { id: 'match', userAId: a, userBId: b, status: 'ACTIVE', conversation: { id: 'conversation' } };
    tx.match.findUnique.mockResolvedValue(activeMatch);
    const result = await matchesRepository.applyInteraction(action);
    expect(result).toEqual({ interaction: { id: 'interaction', ...action }, match: activeMatch });
    expect(tx.book.findUnique).toHaveBeenCalledWith({ where: { id: 'bookA' }, select: { ownerId: true } });
    expect(tx.match.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userAId_userBId: { userAId: a, userBId: b } }
    }));
    expect(tx.interaction.upsert).not.toHaveBeenCalled();
    expect(tx.match.upsert).not.toHaveBeenCalled();
  });
  it.each([{ actorId: a }, { targetBookId: 'other' }, { action: 'PASS' }])('rejects action id with different scope (%j)', async (change) => {
    tx.interactionActionReceipt.findUnique.mockResolvedValue({ ...action, ...change });
    await expect(matchesRepository.applyInteraction(action)).rejects.toMatchObject({ statusCode: 409, code: 'ACTION_ID_CONFLICT' });
    expect(tx.interaction.upsert).not.toHaveBeenCalled();
  });
  it.each([
    [action, { userAId: a, userBId: b, bookAId: 'bookA', bookBId: 'bookB' }],
    [{ ...action, actorId: a, targetBookId: 'bookB' }, { userAId: a, userBId: b, bookAId: 'bookA', bookBId: 'bookB' }]
  ])('stores books in canonical user order (%j)', async (input, expected) => {
    if (input.actorId === a) {
      tx.book.findUnique.mockResolvedValue({ id: 'bookB', ownerId: b, availability: 'AVAILABLE' });
      tx.interaction.findFirst.mockResolvedValue({ actorId: b, targetBookId: 'bookA', action: 'LIKE' });
    }
    await matchesRepository.applyInteraction(input);
    expect(tx.match.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expected, update: {} }));
    expect(tx.interactionActionReceipt.create).toHaveBeenCalledWith({ data: input });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: 'Serializable' }));
  });
  it.each(['PASS', 'LIKE'])('does not match without a current reverse LIKE (%s)', async (value) => {
    tx.interaction.findFirst.mockResolvedValue(null);
    expect((await matchesRepository.applyInteraction({ ...action, action: value })).match).toBeNull();
    expect(tx.match.upsert).not.toHaveBeenCalled();
  });
  it('queries only available reciprocal books owned by the actor', async () => {
    await matchesRepository.applyInteraction(action);
    expect(tx.interaction.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { actorId: a, action: 'LIKE', targetBook: { ownerId: b, availability: 'AVAILABLE' } } }));
  });
  it.each([null, { ownerId: a, availability: 'RESERVED' }, { ownerId: null, availability: 'AVAILABLE' }])('rejects unavailable targets before writing (%j)', async (book) => {
    tx.book.findUnique.mockResolvedValue(book);
    await expect(matchesRepository.applyInteraction(action)).rejects.toMatchObject({ code: 'DISCOVERY_BOOK_NOT_FOUND', statusCode: 404 });
    expect(tx.interactionActionReceipt.create).not.toHaveBeenCalled();
  });
  it('rejects self interaction', async () => {
    await expect(matchesRepository.applyInteraction({ ...action, actorId: a })).rejects.toMatchObject({ code: 'SELF_INTERACTION' });
    expect(tx.interaction.upsert).not.toHaveBeenCalled();
  });
  it.each(['P2034', 'P2002'])('retries transaction conflicts then returns authoritative receipt state (%s)', async (code) => {
    prisma.$transaction.mockRejectedValueOnce({ code });
    tx.interactionActionReceipt.findUnique.mockResolvedValue(action);
    expect((await matchesRepository.applyInteraction(action)).interaction.action).toBe('PASS');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
  it.each(['P2034', 'P2002'])('sanitizes exhausted retries (%s)', async (code) => {
    prisma.$transaction.mockRejectedValue({ code, message: 'private SQL' });
    await expect(matchesRepository.applyInteraction(action)).rejects.toMatchObject({ statusCode: 409, code: 'INTERACTION_RETRY_REQUIRED' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });
});
describe('match removal', () => {
  it('clears both owners current likes, cascades the match, and retains receipts', async () => {
    expect(await matchesRepository.remove(a, 'match')).toEqual({ matchId: 'match', conversationId: 'conversation', participantIds: [a, b] });
    expect(tx.interaction.updateMany).toHaveBeenCalledWith({ where: { action: 'LIKE', OR: [ { actorId: a, targetBook: { ownerId: b } }, { actorId: b, targetBook: { ownerId: a } } ] }, data: { action: 'PASS' } });
    expect(tx.match.delete).toHaveBeenCalledWith({ where: { id: 'match' } });
    expect(tx.interactionActionReceipt.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: 'Serializable' }));
  });
  it.each(['outsider', 'missing'])('returns the same sanitized 404 for %s', async (scenario) => {
    if (scenario === 'missing') tx.match.findUnique.mockResolvedValue(null);
    await expect(matchesRepository.remove(scenario === 'missing' ? a : 'outsider', 'match')).rejects.toMatchObject({ statusCode: 404, code: 'MATCH_NOT_FOUND' });
    expect(tx.interaction.updateMany).not.toHaveBeenCalled();
    expect(tx.match.delete).not.toHaveBeenCalled();
  });
  it('does not report removal before transaction commit', async () => {
    prisma.$transaction.mockImplementation(async (callback) => { await callback(tx); throw { code: 'P2034' }; });
    await expect(matchesRepository.remove(a, 'match')).rejects.toMatchObject({ code: 'MATCH_RETRY_REQUIRED', statusCode: 409 });
  });
});
