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
      if (refreshPromise) return refreshPromise;

      const rotateWithCookie = async () => {
        if (signedOut()) return null;
        const response = await api.refresh();
        if (signedOut()) {
          memorySession = null;
          return null;
        }
        return remember(response);
      };

      refreshPromise = (async () => {
        try {
          return await locks.request(REFRESH_LOCK_NAME, rotateWithCookie);
        } catch (error) {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 401) return null;
          throw error;
        }
      })();

      try { return await refreshPromise; }
      finally { refreshPromise = null; }
    },
    async clear() {
      memorySession = null;
    },
    async signOut() {
      memorySession = null;
      try { getStorage()?.setItem(SIGNED_OUT_KEY, '1'); } catch { /* local storage can be unavailable */ }
      const revokeCookieSession = async () => {
        try { await api.logout(); } catch { /* a local logout must still complete offline */ }
      };
      try {
        if (locks) await locks.request(REFRESH_LOCK_NAME, revokeCookieSession);
        else await revokeCookieSession();
      } catch { /* a local logout must still complete offline */ }
    }
  };
}

export const sessionTransport = createWebSessionTransport();
