import { beforeEach, describe, expect, it, vi } from 'vitest';
const { prisma } = vi.hoisted(() => ({ prisma: { $transaction: vi.fn() } }));
vi.mock('../src/shared/database/prisma.js', () => ({ prisma }));
const { chatRepository } = await import('../src/modules/chat/chat.repository.js');
let tx;
const input = { conversationId: 'conversation', senderId: 'sender', clientMessageId: 'message', body: 'Hello' };
beforeEach(() => {
  tx = { conversationMember: { findFirst: vi.fn().mockResolvedValue({}) }, message: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue(input) }, conversation: { update: vi.fn() } };
  prisma.$transaction.mockReset().mockImplementation(async (callback) => callback(tx));
});
describe('message persistence during match removal', () => {
  it('authorizes again inside the serializable write transaction', async () => {
    tx.conversationMember.findFirst.mockResolvedValue(null);
    await expect(chatRepository.createMessage(input)).rejects.toMatchObject({ statusCode: 404, code: 'CONVERSATION_NOT_FOUND' });
    expect(tx.message.create).not.toHaveBeenCalled();
  });
  it.each(['P2003', 'P2025'])('maps a removal winning the write race to sanitized not-found (%s)', async (code) => {
    tx.message.create.mockRejectedValue({ code, message: 'private SQL' });
    await expect(chatRepository.createMessage(input)).rejects.toMatchObject({ statusCode: 404, code: 'CONVERSATION_NOT_FOUND' });
  });
  it('retries serialization and rechecks membership instead of writing after removal', async () => {
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2034' });
    tx.conversationMember.findFirst.mockResolvedValue(null);
    await expect(chatRepository.createMessage(input)).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
  it('replays a message only from the currently authorized conversation', async () => {
    tx.message.findUnique.mockResolvedValue({ ...input, id: 'saved' });
    expect(await chatRepository.createMessage(input)).toMatchObject({ id: 'saved' });
    expect(tx.message.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });
  it('rejects a message id from another conversation', async () => {
    tx.message.findUnique.mockResolvedValue({ ...input, conversationId: 'other' });
    await expect(chatRepository.createMessage(input)).rejects.toMatchObject({ code: 'MESSAGE_ID_CONFLICT', statusCode: 409 });
  });
});
