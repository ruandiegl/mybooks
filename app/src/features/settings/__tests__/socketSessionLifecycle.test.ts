import { expect, it, vi } from 'vitest';
import { bindSocketSessionLifecycle } from '../../../services/socketSessionLifecycle';
function emitter() {
  const listeners = new Map<string, Function>();
  return { on: (name: string, callback: Function) => { listeners.set(name, callback); }, off: (name: string) => { listeners.delete(name); }, connect: vi.fn(), signal: (name: string, value: unknown) => listeners.get(name)?.(value) };
}
it('reconnects once after a legitimate rotation, but clears only the matching revoked actor', async () => {
  const socket = emitter(), refresh = vi.fn().mockResolvedValue(true), revoke = vi.fn().mockResolvedValue(undefined);
  let current = true;
  const cleanup = bindSocketSessionLifecycle(socket, { isCurrent: () => current, recover: refresh, onRevoked: revoke });
  await socket.signal('session:revoked', { reason: 'rotated' });
  expect(refresh).toHaveBeenCalledTimes(1); expect(socket.connect).toHaveBeenCalledTimes(1); expect(revoke).not.toHaveBeenCalled();
  await socket.signal('session:revoked', { reason: 'terminal' });
  expect(revoke).toHaveBeenCalledTimes(1); expect(socket.connect).toHaveBeenCalledTimes(1);
  current = false; await socket.signal('session:revoked', { reason: 'terminal' });
  expect(revoke).toHaveBeenCalledTimes(1); cleanup();
});
it('does not loop refresh/reconnect when the renewed handshake is rejected', async () => {
  const socket = emitter(), refresh = vi.fn().mockResolvedValue(true);
  bindSocketSessionLifecycle(socket, { isCurrent: () => true, recover: refresh, onRevoked: async () => {} });
  await socket.signal('connect_error', Error('UNAUTHENTICATED'));
  await socket.signal('connect_error', Error('UNAUTHENTICATED'));
  expect(refresh).toHaveBeenCalledTimes(1); expect(socket.connect).toHaveBeenCalledTimes(1);
});
