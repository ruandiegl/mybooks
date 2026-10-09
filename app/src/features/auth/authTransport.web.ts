import { authApi } from './authApi';
import type { SessionResponse, SessionSnapshot, SessionTransport } from './authTransport';

const SIGNED_OUT_KEY = 'trocalivros.auth.signed-out.v1';
const REFRESH_LOCK_NAME = 'trocalivros.auth.refresh.v1';

type SessionMarkerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type BrowserAuthApi = Pick<typeof authApi, 'refresh' | 'logout'>;
type BrowserLockManager = {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

function safeLocalStorage(): SessionMarkerStorage | null {
  try { return window.localStorage; } catch { return null; }
}

function safeLockManager(): BrowserLockManager | null {
  try { return typeof navigator !== 'undefined' ? navigator.locks : null; } catch { return null; }
}

export function createWebSessionTransport(dependencies: {
  auth?: BrowserAuthApi;
  storage?: () => SessionMarkerStorage | null;
  locks?: BrowserLockManager | null;
} = {}): SessionTransport {
  const api = dependencies.auth ?? authApi;
  const getStorage = dependencies.storage ?? safeLocalStorage;
  const locks = dependencies.locks === undefined ? safeLockManager() : dependencies.locks;
  let memorySession: SessionSnapshot | null = null;
  let refreshPromise: Promise<SessionSnapshot | null> | null = null;
  let generation = 0, refreshGeneration = -1;

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
    async refresh() {
      if (signedOut()) {
        memorySession = null;
        return null;
      }
      if (!locks) return null;
      const ticket = generation;
      if (refreshPromise && refreshGeneration === ticket) return refreshPromise;

      const rotateWithCookie = async () => {
        if (signedOut() || ticket !== generation) return null;
        const response = await api.refresh();
        if (signedOut() || ticket !== generation) {
          return null;
        }
        return remember(response);
      };

      const pending = (async () => {
        try {
          return await locks.request(REFRESH_LOCK_NAME, rotateWithCookie);
        } catch (error) {
          if (ticket !== generation) return null;
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 401) return null;
          throw error;
        }
      })();
      refreshPromise = pending; refreshGeneration = ticket;

      try { return await pending; }
      finally { if (refreshPromise === pending) refreshPromise = null; }
    },
    async clear() {
      generation++;
      memorySession = null;
    },
    async signOut() {
      const ticket = generation;
      const revokeCookieSession = async () => {
        await api.logout();
        if (ticket !== generation) return;
        generation++;
        memorySession = null;
        try { getStorage()?.setItem(SIGNED_OUT_KEY, '1'); } catch { /* local storage can be unavailable */ }
      };
      if (locks) await locks.request(REFRESH_LOCK_NAME, revokeCookieSession);
      else await revokeCookieSession();
    }
  };
}

export const sessionTransport = createWebSessionTransport();
