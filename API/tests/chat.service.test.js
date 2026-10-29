import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  chatRepository: { findMembership: vi.fn(), listConversations: vi.fn(), findExchangeBookContext: vi.fn(), listMessages: vi.fn(), createMessage: vi.fn(), markRead: vi.fn() }
}));

vi.mock('../src/modules/chat/chat.repository.js', () => ({ chatRepository: mocks.chatRepository }));
vi.mock('../src/modules/media/storage.service.js', () => ({
  storageService: { getPresignedGetUrl: vi.fn().mockResolvedValue({ url: 'signed-cover', expiresAt: '2026-10-28T12:00:00.000Z' }) }
}));

const { chatService } = await import('../src/modules/chat/chat.service.js');

const userId = '10000000-0000-4000-8000-000000000001';
const conversationId = '20000000-0000-4000-8000-000000000002';
const clientMessageId = '30000000-0000-4000-8000-000000000003';

function message(id, body, createdAt) {
  return { id, clientMessageId: id, conversationId, senderId: userId, body, createdAt, updatedAt: createdAt };
}

describe('chatService', () => {
  beforeEach(() => mocks.chatRepository.findMembership.mockResolvedValue({ conversationId, userId }));

  it('não expõe histórico a quem não participa da conversa', async () => {
    mocks.chatRepository.findMembership.mockResolvedValue(null);

    await expect(chatService.listMessages(userId, conversationId, {})).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
    expect(mocks.chatRepository.listMessages).not.toHaveBeenCalled();
  });

  it('pagina e devolve mensagens em ordem cronológica', async () => {
    const newest = message('50000000-0000-4000-8000-000000000005', 'nova', new Date('2026-08-31T12:00:00Z'));
    const older = message('40000000-0000-4000-8000-000000000004', 'antiga', new Date('2026-08-31T11:00:00Z'));
    const overflow = message('30000000-0000-4000-8000-000000000003', 'mais antiga', new Date('2026-08-31T10:00:00Z'));
    mocks.chatRepository.listMessages.mockResolvedValue([newest, older, overflow]);

    const result = await chatService.listMessages(userId, conversationId, { limit: 2 });

    expect(result.items.map((item) => item.body)).toEqual(['antiga', 'nova']);
    expect(result.pageInfo).toEqual({ hasNextPage: true, nextCursor: older.id });
  });

  it('valida e normaliza o corpo antes de persistir', async () => {
    mocks.chatRepository.createMessage.mockImplementation(async (data) => message(clientMessageId, data.body, new Date()));

    await chatService.sendMessage(userId, conversationId, { clientMessageId, body: '  Olá  ' });

    expect(mocks.chatRepository.createMessage).toHaveBeenCalledWith({ conversationId, senderId: userId, clientMessageId, body: 'Olá' });
  });
});

describe('conversation exchange books', () => {
  const otherId = '40000000-0000-4000-8000-000000000004';
  const bookId = '50000000-0000-4000-8000-000000000005';
  const otherBookId = '60000000-0000-4000-8000-000000000006';
  const bookA = { id: bookId, title: 'Meu livro', authors: ['Autora A'], availability: 'RESERVED', coverExternalUrl: 'external', images: [{ id: 'cover', url: 'uploaded', isCover: true, storageKey: 'private' }] };
  const bookB = { id: otherBookId, title: 'Outro livro', authors: ['Autor B'], availability: 'EXCHANGED', coverExternalUrl: 'external-b', images: [] };
  const match = { userAId: userId, userBId: otherId, userA: { id: userId, name: 'A' }, userB: { id: otherId, name: 'B' }, bookAId: bookId, bookBId: otherBookId, bookA, bookB };
  const conversation = { id: conversationId, matchId: 'match', match, messages: [], updatedAt: new Date() };

  it.each([
    [userId, 'Meu livro', 'Outro livro', 'B'],
    [otherId, 'Outro livro', 'Meu livro', 'A']
  ])('orients exchange books for current user %s', async (currentUserId, mine, theirs, name) => {
    mocks.chatRepository.listConversations.mockResolvedValue([conversation]);
    const [result] = await chatService.listConversations(currentUserId);
    expect(result.otherUser.name).toBe(name);
    expect(result.exchangeBooks.mine.title).toBe(mine);
    expect(result.exchangeBooks.theirs.title).toBe(theirs);
    expect(Object.keys(result.exchangeBooks.mine).sort()).toEqual(['authors', 'availability', 'coverUrl', 'coverUrlExpiresAt', 'id', 'title']);
    expect(result.exchangeBooks[userId === currentUserId ? 'mine' : 'theirs'].coverUrl).toBe('signed-cover');
    expect(result.exchangeBooks[userId === currentUserId ? 'mine' : 'theirs'].coverUrlExpiresAt).toBe('2026-10-28T12:00:00.000Z');
    expect(result.exchangeBooks[userId === currentUserId ? 'theirs' : 'mine'].coverUrlExpiresAt).toBeNull();
    expect(result.lastMessage).toBeNull();
  });

  it('returns unavailable summary for legacy match', async () => {
    mocks.chatRepository.listConversations.mockResolvedValue([{ ...conversation, match: { ...match, bookAId: null, bookBId: null, bookA: null, bookB: null } }]);
    expect((await chatService.listConversations(userId))[0].exchangeBooks).toBeNull();
  });

  it('preserves the remaining book when one linked book was deleted', async () => {
    mocks.chatRepository.listConversations.mockResolvedValue([{ ...conversation, match: { ...match, bookAId: null, bookA: null } }]);
    expect((await chatService.listConversations(userId))[0].exchangeBooks).toEqual({ mine: null, theirs: { id: otherBookId, title: 'Outro livro', authors: ['Autor B'], coverUrl: 'external-b', coverUrlExpiresAt: null, availability: 'EXCHANGED' } });
  });

  it.each(['RESERVED', 'EXCHANGED'])('allows %s contextual details', async (availability) => {
    mocks.chatRepository.findExchangeBookContext.mockResolvedValue({ match: { ...match, bookA: { ...bookA, availability } } });
    const result = await chatService.getExchangeBook(userId, conversationId, bookId);
    expect(result).toMatchObject({ id: bookId, availability, coverUrl: 'signed-cover', images: [{ id: 'cover', url: 'signed-cover', isCover: true }] });
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('returns bookB details when the requested book belongs to the other side', async () => {
    mocks.chatRepository.findExchangeBookContext.mockResolvedValue({ match });
    expect(await chatService.getExchangeBook(userId, conversationId, otherBookId)).toMatchObject({ id: otherBookId, title: 'Outro livro', availability: 'EXCHANGED', coverUrl: 'external-b' });
  });

  it.each([
    ['missing conversation or nonmember', null],
    ['unlinked book', { match: { ...match, bookAId: otherBookId, bookA: bookB } }],
    ['deleted book', { match: { ...match, bookA: null } }]
  ])('hides %s with the same sanitized 404', async (_reason, context) => {
    mocks.chatRepository.findExchangeBookContext.mockResolvedValue(context);
    await expect(chatService.getExchangeBook(userId, conversationId, bookId)).rejects.toMatchObject({ statusCode: 404, code: 'EXCHANGE_BOOK_NOT_FOUND', message: 'Livro da troca não encontrado.' });
  });
});
