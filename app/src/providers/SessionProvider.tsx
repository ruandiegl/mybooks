import { useQueryClient } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { authApi, usesCookieSession } from '../features/auth/authApi';
import { clearTokens, loadTokens, saveTokens } from '../features/auth/authStorage';
import { signOutSession } from '../features/auth/sessionActions';
import { configureApiSession } from '../services/api';
import type { AuthSessionResponse, AuthTokens, User } from '../types/api';

type SessionContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: User | null;
  getToken: () => Promise<string | null>;
  establishSession: (response: AuthSessionResponse) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  refreshUser: () => Promise<User | null>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function sessionTokens(response: AuthSessionResponse): AuthTokens {
  const expiresAt = Date.parse(response.expiresAt);
  if (!Number.isFinite(expiresAt)) throw new Error('Expiração de sessão inválida.');
  return { accessToken: response.accessToken, refreshToken: response.refreshToken ?? null, expiresAt };
}

export function SessionProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient();
  const tokensRef = useRef<AuthTokens | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const replaceTokens = useCallback(async (next: AuthTokens | null) => {
    if (next) await saveTokens(next);
    else await clearTokens();
    tokensRef.current = next;
    setTokens(next);
  }, []);

  const establishSession = useCallback(async (response: AuthSessionResponse) => {
    await replaceTokens(sessionTokens(response));
    setUser(response.user);
  }, [replaceTokens]);

  const clearSession = useCallback(async () => {
    await replaceTokens(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient, replaceTokens]);

  const refreshSession = useCallback(async () => {
    const current = tokensRef.current;
    if (!current?.refreshToken && !usesCookieSession) return false;

    try {
      await establishSession(await authApi.refresh(current?.refreshToken ?? null));
      return true;
    } catch {
      await clearSession();
      return false;
    }
  }, [clearSession, establishSession]);

  const getToken = useCallback(async () => tokensRef.current?.accessToken ?? null, []);

  const refreshUser = useCallback(async () => {
    if (!tokensRef.current) return null;
    const currentUser = await authApi.me();
    setUser(currentUser);
    return currentUser;
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = tokensRef.current?.refreshToken ?? null;
    await signOutSession({
      refreshToken,
      cookieSession: usesCookieSession,
      revoke: authApi.logout,
      clearLocalSession: clearSession
    });
  }, [clearSession]);

  useLayoutEffect(() => {
    configureApiSession({ getAccessToken: getToken, refresh: refreshSession, onUnauthorized: clearSession });
  }, [clearSession, getToken, refreshSession]);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const stored = await loadTokens();
        if (!active) return;
        if (!stored) {
          if (!usesCookieSession || !await refreshSession()) return;
          await refreshUser();
          return;
        }
        tokensRef.current = stored;
        setTokens(stored);

        if (stored.expiresAt <= Date.now() + 60_000 && !await refreshSession()) return;
        const currentUser = await refreshUser();
        if (!active && currentUser) return;
      } catch {
        if (active) await clearSession();
      } finally {
        if (active) setIsLoaded(true);
      }
    };

    void hydrate();
    return () => { active = false; };
  }, [clearSession, refreshSession, refreshUser]);

  const value = useMemo<SessionContextValue>(() => ({
    isLoaded,
    isSignedIn: Boolean(tokens && user),
    user,
    getToken,
    establishSession,
    refreshSession,
    refreshUser,
    signOut
  }), [establishSession, getToken, isLoaded, refreshSession, refreshUser, signOut, tokens, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession deve ser usado dentro de SessionProvider.');
  return context;
}
