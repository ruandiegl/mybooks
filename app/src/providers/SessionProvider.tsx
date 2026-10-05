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
import { mergeAvatarVersion } from '../features/avatar/avatarRefresh';
import { avatarDescriptorOf } from '../features/avatar/avatarTypes';
import { useAvatarRefresh } from '../features/avatar/useAvatarRefresh';
import type { AvatarDescriptor, User } from '../types/api';

type SessionContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: User | null;
  getToken: () => Promise<string | null>;
  establishSession: (response: SessionResponse) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  refreshUser: () => Promise<User | null>;
  refreshAvatar: () => void;
  updateAvatar: (avatar: AvatarDescriptor, userId: string) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient();
  const sessionRef = useRef<SessionSnapshot | null>(null);
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef(user); userRef.current = user;
  const epoch = useRef(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const replaceSession = useCallback((next: SessionSnapshot | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const establishSession = useCallback(async (response: SessionResponse) => {
    epoch.current++;
    const next = await sessionTransport.accept(response);
    replaceSession(next);
    setUser(next.user ?? response.user);
  }, [replaceSession]);

  const clearSession = useCallback(async () => {
    epoch.current++;
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
    if (next.user) setUser(mergeAvatarVersion(userRef.current, next.user));
    return true;
  }, [clearSession, replaceSession]);

  const getToken = useCallback(async () => sessionTransport.getToken(sessionRef.current), []);

  const refreshUser = useCallback(async () => {
    if (!sessionRef.current) return null;
    const ticket = epoch.current;
    const fetched = await queryClient.fetchQuery({ queryKey: ['me'], queryFn: authApi.me, staleTime: 0 });
    if (ticket !== epoch.current || !sessionRef.current) return null;
    const currentUser = mergeAvatarVersion(userRef.current, fetched);
    setUser(currentUser);
    replaceSession({ ...sessionRef.current, user: currentUser });
    return currentUser;
  }, [replaceSession, queryClient]);

  const updateAvatar = useCallback((avatar: AvatarDescriptor, userId: string) => {
    const current = userRef.current;
    if (!current || current.id !== userId || sessionRef.current?.user?.id !== userId) return;
    const next = mergeAvatarVersion(current, { ...current, ...avatar });
    userRef.current = next;
    setUser(next);
    if (sessionRef.current) replaceSession({ ...sessionRef.current, user: next });
    void queryClient.cancelQueries({ queryKey: ['me'] });
    queryClient.setQueryData<User>(['me'], old => mergeAvatarVersion(old, { ...(old?.id === next.id ? old : next), ...avatarDescriptorOf(next) }));
  }, [queryClient, replaceSession]);
  const refreshAvatar = useAvatarRefresh(user, refreshUser, isLoaded && Boolean(session));

  const signOut = useCallback(async () => {
    const current = sessionRef.current;
    await sessionTransport.signOut(current);
    await clearSession();
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
    refreshAvatar,
    updateAvatar,
    signOut
  }), [establishSession, getToken, isLoaded, refreshSession, refreshUser, refreshAvatar, updateAvatar, session, signOut, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession deve ser usado dentro de SessionProvider.');
  return context;
}
