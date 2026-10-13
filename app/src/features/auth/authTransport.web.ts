import { authApi } from './authApi';
import type { SessionResponse, SessionSnapshot, SessionTransport } from './authTransport';
import { accessSessionId, type SessionActor } from './sessionActor';
import { withBrowserSessionLock, safeBrowserLocks, type BrowserLockManager } from './browserSessionLock.web';
import type { ChangePasswordInput } from '../../types/api';

const SIGNED_OUT_KEY = 'trocalivros.auth.signed-out.v1';

type SessionMarkerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type BrowserAuthApi = {
  refresh(actor?: SessionActor): Promise<SessionResponse>;
  rebind?(actor: SessionActor): Promise<SessionResponse>;
  logout(actor?: SessionActor): Promise<{ ok: boolean }>;
  logoutAll?(token: string, actor: SessionActor): Promise<{ ok: boolean }>;
  changePassword?(token: string, input: ChangePasswordInput, actor: SessionActor): Promise<{ ok: boolean }>;
};

function safeLocalStorage(): SessionMarkerStorage | null {
  try { return window.localStorage; } catch { return null; }
}

export function createWebSessionTransport(dependencies: {
  auth?: BrowserAuthApi;
  storage?: () => SessionMarkerStorage | null;
  locks?: BrowserLockManager | null;
} = {}): SessionTransport {
  const api = dependencies.auth ?? (authApi as unknown as BrowserAuthApi);
  const getStorage = dependencies.storage ?? safeLocalStorage;
  const locks = dependencies.locks === undefined ? safeBrowserLocks() : dependencies.locks;
  let memorySession: SessionSnapshot | null = null;
  let refreshPromise: Promise<SessionSnapshot | null> | null = null;
  let refreshGeneration = -1;
  let generation = 0;

  const signedOut = () => {
    try { return getStorage()?.getItem(SIGNED_OUT_KEY) === '1'; } catch { return false; }
  };

  const clearSignedOutMarker = () => {
    try { getStorage()?.removeItem(SIGNED_OUT_KEY); } catch { /* browser storage can be unavailable */ }
  };

  const remember = (response: SessionResponse): SessionSnapshot => {
    const expiresAt = Date.parse(response.expiresAt);
    if (!Number.isFinite(expiresAt) || !response.accessToken) throw new Error('Expiração de sessão inválida.');
    const next = { accessToken: response.accessToken, expiresAt, user: response.user };
    memorySession = next;
    clearSignedOutMarker();
    return next;
  };

  const markSignedOut = () => { memorySession = null; generation++; try { getStorage()?.setItem(SIGNED_OUT_KEY, '1'); } catch {} };
  const terminal = (current: SessionSnapshot | null, actor: SessionActor | undefined, isCurrent: (() => boolean) | undefined, operation: (token: string) => Promise<unknown>) => {
    const ticket = generation;
    const guard = () => generation === ticket && (!isCurrent || isCurrent());
    return withBrowserSessionLock(async () => {
      const token = memorySession?.accessToken ?? current?.accessToken ?? '';
      await operation(token);
      if (guard()) markSignedOut();
    }, guard, locks);
  };

  return {
    async restore() {
      if (signedOut()) {
        memorySession = null;
        return null;
      }
      if (memorySession) return memorySession;
      return this.refresh(null);
    },
    async accept(response) {
      generation++;
      return remember(response);
    },
    async getToken(current) {
      if (signedOut()) {
        memorySession = null;
        return null;
      }
      return memorySession?.accessToken ?? current?.accessToken ?? null;
    },
    async refresh(current) {
      if (signedOut()) {
        memorySession = null;
        return null;
      }
      if (!locks) return null;
      if (refreshPromise && refreshGeneration === generation) return refreshPromise;
      const ticket = generation;
      const origin = memorySession ?? current;
      let actor: SessionActor | undefined;
      if (origin?.user) {
        const sessionId = accessSessionId(origin.accessToken, origin.user.id);
        if (!sessionId) throw Error('Sessão de origem inválida. Entre novamente.');
        actor = { userId: origin.user.id, sessionId, epoch: 0 };
      }

      const rotateWithCookie = async () => {
        if (signedOut()) return null;
        if (generation !== ticket) return null;
        const response = await api.refresh(actor);
        if (generation !== ticket) return null;
        if (signedOut()) {
          memorySession = null;
          return null;
        }
        return remember(response);
      };

      const ownPromise = (async () => {
        try {
          return await withBrowserSessionLock(rotateWithCookie, undefined, locks);
        } catch (error) {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 401) return null;
          throw error;
        }
      })();
      refreshPromise = ownPromise; refreshGeneration = ticket;
      try { return await ownPromise; }
      finally { if (refreshPromise === ownPromise) { refreshPromise = null; refreshGeneration = -1; } }
    },
    async rebind(current, reason) {
      if (signedOut()) return null;
      const ticket = generation, origin = memorySession ?? current;
      if (!origin?.user) return null;
      const sessionId = accessSessionId(origin.accessToken, origin.user.id);
      if (!sessionId) throw Error('Sessão de origem inválida. Entre novamente.');
      const actor = { userId: origin.user.id, sessionId, epoch: 0 };
      try {
        return await withBrowserSessionLock(async () => {
          if (generation !== ticket || signedOut()) return null;
          if (!api.rebind) throw Object.assign(Error('Rebind indisponível.'), { response: { status: 404 } });
          const response = await api.rebind(actor);
          if (generation !== ticket || signedOut()) return null;
          if (response.user.id !== actor.userId) throw Error('A sessão mudou.');
          return remember(response);
        }, undefined, locks);
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401) return null;
        // An older API does not broadcast retirement; compatibility refresh occurs after releasing the lock.
        if (status === 404 && reason !== 'rotated' && generation === ticket) return this.refresh(current);
        throw error;
      }
    },
    async clear() {
      generation++; memorySession = null;
    },
    async signOut(current, actor, isCurrent) {
      await terminal(current, actor, isCurrent, () => api.logout(actor));
    },
    async signOutAll(current, actor, isCurrent) {
      await terminal(current, actor, isCurrent, token => { if (!api.logoutAll) throw Error('Esta ação ainda não está disponível.'); return api.logoutAll(token, actor); });
    },
    async changePassword(current, input: ChangePasswordInput, actor, isCurrent) {
      await terminal(current, actor, isCurrent, token => { if (!api.changePassword) throw Error('Esta ação ainda não está disponível.'); return api.changePassword(token, input, actor); });
    }
  };
}

export const sessionTransport = createWebSessionTransport();
