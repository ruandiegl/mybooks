import { expect, it, vi } from 'vitest';
vi.mock('../../auth/authApi', () => ({ authApi: {} }));
import { createWebSessionTransport } from '../../auth/authTransport.web';
import { bindSocketSessionLifecycle } from '../../../services/socketSessionLifecycle';
import { accessSessionId } from '../../auth/sessionActor';
import type { SessionSnapshot, SessionTransport } from '../../auth/authTransport';
it('keeps two connected tabs stable after the shared cookie rotates, including delayed responses', async () => {
  let tail: Promise<unknown> = Promise.resolve(), rotations = 0, ioPending = 0;
  const locks = { request<T>(_name: string, callback: () => Promise<T>) { const next = tail.catch(() => {}).then(callback); tail = next; return next; } };
  type SocketProbe = { connected: boolean; sid: string; on(name: string, fn: (...args: any[]) => unknown): void; off(name: string): void; emit(name: string, value?: unknown): unknown; disconnect(): void; connect(): void };
  const sockets: SocketProbe[] = [];
  const currentSid = () => `10000000-0000-4000-8000-${String(rotations).padStart(12, '0')}`;
  const user = { id: 'reader', name: 'Reader', interests: [], isActive: true };
  const response = () => ({ accessToken: `e30.${btoa(JSON.stringify({ sub: user.id, sid: currentSid() }))}.test`, expiresAt: '2030-01-01T00:00:00Z', user });
  const requests = {
    async refresh() {
      if (rotations >= 8) throw Error('diagnostic cap: unexpected refresh cycle');
      const retired = currentSid(); rotations++; ioPending++;
      queueMicrotask(() => { for (const target of sockets) if (target.connected && target.sid === retired) { target.connected = false; void target.emit('session:revoked', { reason: 'rotated' }); } });
      try { await new Promise(resolve => setTimeout(resolve, 5)); return response(); } finally { ioPending--; }
    },
    async rebind() { ioPending++; try { await new Promise(resolve => setTimeout(resolve, 5)); return response(); } finally { ioPending--; } },
    async logout() { return { ok: true }; }
  };
  function socket(transport: SessionTransport): SocketProbe {
    const handlers = new Map<string, (...args: any[]) => unknown>();
    const target = { connected: false, sid: '', on: (name: string, fn: (...args: any[]) => unknown) => { handlers.set(name, fn); }, off: (name: string) => { handlers.delete(name); },
      emit: (name: string, value?: unknown) => handlers.get(name)?.(value), disconnect: () => { target.connected = false; },
      connect: () => { void transport.getToken(null).then(token => { target.sid = token ? accessSessionId(token, user.id)! : ''; if (target.sid !== currentSid()) void target.emit('connect_error', Error('UNAUTHENTICATED')); else { target.connected = true; target.emit('connect'); } }); } };
    sockets.push(target); return target;
  }
  const cleanups: (() => void)[] = [];
  try {
    for (let n = 0; n < 2; n++) {
      const transport = createWebSessionTransport({ auth: requests, locks, storage: () => null });
      let current = await transport.restore();
      const target = socket(transport);
      const renew = async (cause: string) => {
        const rebind = (transport as unknown as { rebind?: (current: SessionSnapshot | null, cause: any) => Promise<SessionSnapshot | null> }).rebind;
        current = rebind ? await rebind.call(transport, current, cause) : await transport.refresh(current);
        return Boolean(current);
      };
      const lifecycle = { isCurrent: () => true, refresh: () => renew('unauthenticated'), recover: renew, onRevoked: async () => {} };
      cleanups.push(bindSocketSessionLifecycle(target, lifecycle)); target.connect();
      await new Promise(resolve => setTimeout(resolve, 15));
    }
    for (let n = 0; n < 60 && (ioPending || sockets.some(target => !target.connected)); n++) await new Promise(resolve => setTimeout(resolve, 5));
    expect(rotations).toBe(2);
    expect(sockets.map(target => target.connected)).toEqual([true, true]);
    expect(sockets.map(target => target.sid)).toEqual([currentSid(), currentSid()]);
  } finally { cleanups.forEach(cleanup => cleanup()); sockets.forEach(target => target.disconnect()); }
});
