import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  chatRepository: { findMembership: vi.fn(), listMessages: vi.fn(), createMessage: vi.fn(), markRead: vi.fn() }
}));

vi.mock('../src/modules/chat/chat.repository.js', () => ({ chatRepository: mocks.chatRepository }));

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
