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

  it('provides a null token when token access throws synchronously', async () => {
    const socket = { autoConnect: false };
    io.mockReturnValue(socket);
    const getToken = (() => { throw new Error('session store unavailable'); }) as unknown as () => Promise<string | null>;
    const created = await createChatSocket({ getToken });
    const options = io.mock.calls[0][1];
    const handshake = vi.fn();

    expect(() => options.auth(handshake)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(created).toBe(socket);
    expect(handshake).toHaveBeenCalledTimes(1);
    expect(handshake).toHaveBeenCalledWith({ token: null });
  });
});
