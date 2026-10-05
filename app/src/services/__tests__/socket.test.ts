import { beforeEach, describe, expect, it, vi } from 'vitest';

const { io } = vi.hoisted(() => ({ io: vi.fn() }));
vi.mock('socket.io-client', () => ({ io }));

import { createChatSocket } from '../socket';

describe('chat socket session', () => {
  beforeEach(() => io.mockReset());

  it('reads the current access token for every Socket.IO handshake', async () => {
    const socket = { autoConnect: false };
    io.mockReturnValue(socket);
    let token = 'first-access-token';
    const created = await createChatSocket({ getToken: async () => token });
    const options = io.mock.calls[0][1];
    const handshake = vi.fn();

    expect(created).toBe(socket);
    expect(typeof options.auth).toBe('function');
    await options.auth(handshake);
    expect(handshake).toHaveBeenCalledWith({ token: 'first-access-token' });

    token = 'refreshed-access-token';
    await options.auth(handshake);
    expect(handshake).toHaveBeenLastCalledWith({ token: 'refreshed-access-token' });
  });
});
