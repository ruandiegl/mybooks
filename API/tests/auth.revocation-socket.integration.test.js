import { createServer } from 'node:http';
import { EventEmitter } from 'node:events';
import { io as connect } from 'socket.io-client';
import { describe, expect, it } from 'vitest';
import { registerChatSocket } from '../src/modules/chat/chat.socket.js';
function once(target, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { target.off(name, finish); reject(Error(`Timed out waiting for ${name}`)); }, 2000);
    function finish(value) { clearTimeout(timer); resolve(value); }
    target.once(name, finish);
  });
}
describe('live socket revocation', () => {
  it('disconnects only affected sid and unregisters the server listener on close', async () => {
    const bus = new EventEmitter(), server = createServer(), sessions = new Set(['first', 'second']);
    const repository = { findActiveSession: async sid => sessions.has(sid) ? { id: sid, user: { id: 'ana' } } : null };
    const service = { assertMember: async () => {} };
    const sockets = registerChatSocket(server, { repository, service, verifyToken: async token => ({ userId: 'ana', sessionId: token }), revocationBus: bus });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const a = connect(url, { auth: { token: 'first' }, transports: ['websocket'], autoConnect: false });
    const b = connect(url, { auth: { token: 'second' }, transports: ['websocket'], autoConnect: false });
    try {
      const ready = Promise.all([once(a, 'connect'), once(b, 'connect')]); a.connect(); b.connect(); await ready;
      expect(bus.listenerCount('revoked')).toBe(1);
      const closed = once(a, 'disconnect'); sessions.delete('first'); bus.emit('revoked', { userId: 'ana', sessionIds: ['first'], reason: 'terminal' }); await closed;
      expect(a.connected).toBe(false); expect(b.connected).toBe(true);
      const ack = await new Promise(resolve => b.emit('conversation:join', { conversationId: 'one' }, resolve));
      expect(ack).toEqual({ ok: true });
    } finally { a.close(); b.close(); await new Promise(resolve => sockets.close(resolve)); }
    expect(bus.listenerCount('revoked')).toBe(0);
  });
  it('checks database session on events even if no local revocation signal was received', async () => {
    let alive = true, calls = 0;
    const bus = new EventEmitter(), server = createServer();
    const sockets = registerChatSocket(server, { repository: { findActiveSession: async () => alive ? { user: { id: 'ana' } } : null }, service: { assertMember: async () => { calls++; } }, verifyToken: async () => ({ userId: 'ana', sessionId: 'first' }), revocationBus: bus });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const client = connect(`http://127.0.0.1:${server.address().port}`, { auth: { token: 'first' }, transports: ['websocket'], autoConnect: false });
    try {
      const ready = once(client, 'connect'); client.connect(); await ready; alive = false;
      const closed = once(client, 'disconnect'); client.emit('conversation:join', { conversationId: 'one' }); await closed;
      expect(calls).toBe(0);
    } finally { client.close(); await new Promise(resolve => sockets.close(resolve)); }
  });
  it('reports access-token expiration as recoverable rather than a terminal logout', async () => {
    const server = createServer(), bus = new EventEmitter(); let verified = 0;
    const sockets = registerChatSocket(server, { repository: { findActiveSession: async () => ({ user: { id: 'ana' } }) }, service: { assertMember: async () => {} }, verifyToken: async () => { if (++verified > 1) throw Object.assign(Error('expired'), { code: 'ERR_JWT_EXPIRED' }); return { userId: 'ana', sessionId: 'first' }; }, revocationBus: bus });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const client = connect(`http://127.0.0.1:${server.address().port}`, { auth: { token: 'first' }, transports: ['websocket'], autoConnect: false });
    try {
      const ready = once(client, 'connect'); client.connect(); await ready;
      const signal = once(client, 'session:revoked'); client.emit('conversation:join', { conversationId: 'one' });
      expect(await signal).toEqual({ reason: 'expired' });
    } finally { client.close(); await new Promise(resolve => sockets.close(resolve)); }
  });
});
