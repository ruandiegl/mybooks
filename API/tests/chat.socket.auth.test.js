import { describe, expect, it, vi } from 'vitest';
import { createSocketAuthenticator } from '../src/modules/chat/chat.socket.js';

const run = (authenticate, auth = {}) => new Promise((resolve) => {
  const socket = { handshake: { auth }, data: {} };
  authenticate(socket, (error) => resolve({ socket, error }));
});

describe('native Socket.IO authentication', () => {
  it('accepts a native access token only when its database session is active', async () => {
    const verifyToken = vi.fn().mockResolvedValue({
      userId: 'user-1',
      sessionId: 'session-1',
      jti: 'jti-1'
    });
    const findActiveSession = vi.fn().mockResolvedValue({
      id: 'session-1',
      user: { id: 'user-1', isActive: true }
    });
    const authenticate = createSocketAuthenticator({ verifyToken, findActiveSession });

    const result = await run(authenticate, { token: 'signed-token' });

    expect(result.error).toBeUndefined();
    expect(verifyToken).toHaveBeenCalledWith('signed-token');
    expect(findActiveSession).toHaveBeenCalledWith('session-1', 'user-1', expect.any(Date));
    expect(result.socket.data.user).toMatchObject({ id: 'user-1' });
    expect(result.socket.data.identity).toMatchObject({ sessionId: 'session-1' });
  });

  it.each([
    ['token ausente', {}, async () => ({})],
    ['token expirado ou inválido', { token: 'expired' }, async () => { throw new Error('expired'); }],
    ['sessão revogada', { token: 'valid' }, async () => ({ userId: 'user-1', sessionId: 'session-1', jti: 'jti-1' })]
  ])('rejects %s with the same public error', async (_label, auth, verifyToken) => {
    const authenticate = createSocketAuthenticator({
      verifyToken,
      findActiveSession: async () => null
    });

    const result = await run(authenticate, auth);

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe('UNAUTHENTICATED');
    expect(result.socket.data.user).toBeUndefined();
  });

  it('never accepts a development user id supplied by the client', async () => {
    const authenticate = createSocketAuthenticator({
      verifyToken: async () => ({}),
      findActiveSession: async () => null
    });

    const result = await run(authenticate, { devUserId: 'admin' });

    expect(result.error?.message).toBe('UNAUTHENTICATED');
  });
});
