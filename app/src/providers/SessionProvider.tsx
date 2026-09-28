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
import { authApi } from '../features/auth/authApi';
import { sessionTransport, type SessionResponse, type SessionSnapshot } from '../features/auth/authTransport';
import { configureApiSession } from '../services/api';
import type { User } from '../types/api';

type SessionContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: User | null;
  getToken: () => Promise<string | null>;
  establishSession: (response: SessionResponse) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  refreshUser: () => Promise<User | null>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient();
  const sessionRef = useRef<SessionSnapshot | null>(null);
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const replaceSession = useCallback((next: SessionSnapshot | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const establishSession = useCallback(async (response: SessionResponse) => {
    const next = await sessionTransport.accept(response);
    replaceSession(next);
    setUser(next.user ?? response.user);
  }, [replaceSession]);

  const clearSession = useCallback(async () => {
    await sessionTransport.clear();
    replaceSession(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient, replaceSession]);

  const refreshSession = useCallback(async () => {
    const next = await sessionTransport.refresh(sessionRef.current);
    if (!next) {
      await clearSession();
      return false;
    }

    replaceSession(next);
    if (next.user) setUser(next.user);
    return true;
  }, [clearSession, replaceSession]);

  const getToken = useCallback(async () => sessionTransport.getToken(sessionRef.current), []);

  const refreshUser = useCallback(async () => {
    if (!sessionRef.current) return null;
    const currentUser = await authApi.me();
    setUser(currentUser);
    replaceSession({ ...sessionRef.current, user: currentUser });
    return currentUser;
  }, [replaceSession]);

  const signOut = useCallback(async () => {
    const current = sessionRef.current;
    const remoteSignOut = sessionTransport.signOut(current);
    await clearSession();
    await remoteSignOut;
  }, [clearSession]);

  useLayoutEffect(() => {
    configureApiSession({ getAccessToken: getToken, refresh: refreshSession, onUnauthorized: clearSession });
  }, [clearSession, getToken, refreshSession]);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const restored = await sessionTransport.restore();
        if (!restored || !active) return;
        replaceSession(restored);
        if (restored.user) setUser(restored.user);

        if (restored.expiresAt <= Date.now() + 60_000) {
          try {
            if (!await refreshSession()) return;
          } catch {
            return;
          }
        }
        if (!restored.user) {
          const currentUser = await authApi.me();
          if (!active) return;
          setUser(currentUser);
          replaceSession({ ...sessionRef.current!, user: currentUser });
        }
      } catch {
        if (active) await clearSession();
      } finally {
        if (active) setIsLoaded(true);
      }
    };

    void hydrate();
    return () => { active = false; };
  }, [clearSession, refreshSession, replaceSession]);

  const value = useMemo<SessionContextValue>(() => ({
    isLoaded,
    isSignedIn: Boolean(session && user),
    user,
    getToken,
    establishSession,
    refreshSession,
    refreshUser,
    signOut
  }), [establishSession, getToken, isLoaded, refreshSession, refreshUser, session, signOut, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession deve ser usado dentro de SessionProvider.');
  return context;
}
