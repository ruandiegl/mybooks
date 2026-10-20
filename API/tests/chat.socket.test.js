import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/shared/errors/AppError.js';
const mocks = vi.hoisted(() => ({
  io: { use: vi.fn(), on: vi.fn(), to: vi.fn().mockReturnThis(), emit: vi.fn() },
  chatService: { assertMember: vi.fn(), sendMessage: vi.fn(), markRead: vi.fn() }
}));
vi.mock('socket.io', () => ({ Server: class { constructor() { return mocks.io; } } }));
vi.mock('../src/modules/chat/chat.service.js', () => ({ chatService: mocks.chatService }));
const { registerChatSocket } = await import('../src/modules/chat/chat.socket.js');
const id = '30000000-0000-4000-8000-000000000003';
let handlers;
let socket;
let ack;
beforeEach(() => {
  handlers = {};
  ack = vi.fn();
  mocks.chatService.assertMember.mockReset().mockResolvedValue({});
  socket = { data: { user: { id: 'userA' } }, join: vi.fn(), leave: vi.fn(), to: vi.fn().mockReturnThis(), emit: vi.fn(), on: vi.fn((event, handler) => { handlers[event] = handler; }) };
  registerChatSocket({});
  mocks.io.on.mock.calls.at(-1)[1](socket);
});
describe('chat socket membership lifecycle', () => {
  it('joins the authenticated personal room and a verified conversation', async () => {
    await handlers['conversation:join']({ conversationId: id }, ack);
    expect(socket.join).toHaveBeenCalledWith('user:userA');
    expect(socket.join).toHaveBeenCalledWith('conversation:' + id);
    expect(ack).toHaveBeenCalledWith({ ok: true });
  });
  it('leaves only the selected conversation even when it was removed', async () => {
    await handlers['conversation:leave']({ conversationId: id }, ack);
    expect(socket.leave).toHaveBeenCalledExactlyOnceWith('conversation:' + id);
    expect(ack).toHaveBeenCalledWith({ ok: true });
  });
  it('rejects malformed leave without changing rooms', async () => {
    await handlers['conversation:leave']({ conversationId: 'bad' }, ack);
    expect(socket.leave).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
  it('evicts a late join when removal commits while joining', async () => {
    mocks.chatService.assertMember.mockResolvedValueOnce({}).mockRejectedValueOnce(new AppError('Conversa não encontrada.', { code: 'CONVERSATION_NOT_FOUND', statusCode: 404 }));
    await handlers['conversation:join']({ conversationId: id }, ack);
    expect(socket.leave).toHaveBeenCalledWith('conversation:' + id);
    expect(socket.emit).not.toHaveBeenCalledWith('presence:updated', expect.anything());
    expect(ack).toHaveBeenCalledWith({ ok: false, error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversa não encontrada.' } });
  });
  it('refuses sending after removal and emits no acceptance', async () => {
    mocks.chatService.sendMessage.mockRejectedValue(new AppError('Conversa não encontrada.', { code: 'CONVERSATION_NOT_FOUND', statusCode: 404 }));
    await handlers['message:send']({ conversationId: id, body: 'hello' }, ack);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: expect.objectContaining({ code: 'CONVERSATION_NOT_FOUND' }) }));
    expect(mocks.io.emit).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalledWith('message:ack', expect.anything());
  });
  it('sanitizes unexpected storage errors', async () => {
    mocks.chatService.sendMessage.mockRejectedValue({ code: 'P2003', message: 'private SQL' });
    await handlers['message:send']({ conversationId: id }, ack);
    expect(ack).toHaveBeenCalledWith({ ok: false, error: { code: 'SOCKET_ERROR', message: 'Não foi possível concluir a operação.' } });
  });
});
