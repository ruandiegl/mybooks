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
import { sessionTransport, type SessionResponse, type SessionSnapshot, type SocketRecoveryReason } from '../features/auth/authTransport';
import { configureApiSession } from '../services/api';
import { mergeAvatarVersion } from '../features/avatar/avatarRefresh';
import { avatarDescriptorOf } from '../features/avatar/avatarTypes';
import { disposeMediaScope } from '../features/media/mediaPrefetch';
import { useAvatarRefresh } from '../features/avatar/useAvatarRefresh';
import type { AvatarDescriptor, ChangePasswordInput, User } from '../types/api';
import { accessSessionId, type SessionActor } from '../features/auth/sessionActor';

export type SessionScope = { userId: string | undefined; epoch: number };
type SessionContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: User | null;
  getToken: () => Promise<string | null>;
  getSessionScope: () => SessionScope;
  establishSession: (response: SessionResponse) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  rebindSession: (reason: SocketRecoveryReason) => Promise<boolean>;
  refreshUser: () => Promise<User | null>;
  refreshAvatar: () => void;
  updateAvatar: (avatar: AvatarDescriptor, userId: string) => void;
  captureActor: () => SessionActor | null;
  isActorCurrent: (actor: SessionActor) => boolean;
  updateUser: (user: User, actor: SessionActor) => void;
  signOut: (actor?: SessionActor) => Promise<void>;
  signOutAll: (actor: SessionActor) => Promise<void>;
  changePassword: (input: ChangePasswordInput, actor: SessionActor) => Promise<void>;
  sessionNotice?: string;
  endRevokedSession: (actor: SessionActor) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient();
  const sessionRef = useRef<SessionSnapshot | null>(null);
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef(user); userRef.current = user;
  const epoch = useRef(0);
  const scopeActive = useRef(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string>();
  const terminal = useRef<{ epoch: number; operation: string; promise: Promise<void> } | null>(null);
  const endedActor = useRef<{ userId: string; epoch: number; afterEpoch: number } | null>(null);

  const captureActor = useCallback((): SessionActor | null => {
    const current = sessionRef.current;
    const owner = userRef.current;
    if (!current || !owner) return null;
    const sessionId = accessSessionId(current.accessToken, owner.id);
    return sessionId ? { userId: owner.id, epoch: epoch.current, sessionId } : null;
  }, []);
  const isActorCurrent = useCallback((actor: SessionActor) => Boolean(sessionRef.current && userRef.current?.id === actor.userId && epoch.current === actor.epoch), []);

  const replaceSession = useCallback((next: SessionSnapshot | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const establishSession = useCallback(async (response: SessionResponse) => {
    const previous = userRef.current ? { userId: userRef.current.id, epoch: epoch.current } : null;
    const ticket = ++epoch.current;
    if (previous) void disposeMediaScope(previous);
    endedActor.current = null;
    userRef.current = null; replaceSession(null); setUser(null); queryClient.clear();
    const next = await sessionTransport.accept(response);
    if (ticket !== epoch.current || !scopeActive.current) return;
    replaceSession(next);
    userRef.current = next.user ?? response.user;
    setUser(userRef.current); setSessionNotice(undefined);
  }, [replaceSession, queryClient]);

  const clearSession = useCallback(async () => {
    const previous = userRef.current;
    endedActor.current = previous ? { userId: previous.id, epoch: epoch.current, afterEpoch: epoch.current + 1 } : null;
    const previousScope = previous ? { userId: previous.id, epoch: epoch.current } : null;
    epoch.current++;
    if (previousScope) void disposeMediaScope(previousScope);
    replaceSession(null);
    userRef.current = null; setUser(null);
    queryClient.clear();
    await sessionTransport.clear();
  }, [queryClient, replaceSession]);

  const refreshSession = useCallback(async () => {
    const ticket = epoch.current;
    const current = () => scopeActive.current && ticket === epoch.current;
    let next: SessionSnapshot | null;
    try { next = await sessionTransport.refresh(sessionRef.current); }
    catch (error) { if (!current()) return false; throw error; }
    if (!current()) return false;
    if (!next) {
      await clearSession();
      return false;
    }

    replaceSession(next);
    if (next.user) { userRef.current = mergeAvatarVersion(userRef.current, next.user); setUser(userRef.current); }
    return true;
  }, [clearSession, replaceSession]);

  const getToken = useCallback(async () => sessionTransport.getToken(sessionRef.current), []);
  const getSessionScope = useCallback(() => ({ userId: scopeActive.current ? userRef.current?.id : undefined, epoch: epoch.current }), []);
  const rebindSession = useCallback(async (reason: SocketRecoveryReason) => {
    const ticket = epoch.current;
    const next = await sessionTransport.rebind(sessionRef.current, reason);
    if (ticket !== epoch.current) return false;
    if (!next) { await clearSession(); return false; }
    replaceSession(next);
    if (next.user) { userRef.current = mergeAvatarVersion(userRef.current, next.user); setUser(userRef.current); }
    return true;
  }, [clearSession, replaceSession]);

  const refreshUser = useCallback(async () => {
    if (!sessionRef.current) return null;
    const ticket = epoch.current;
    let fetched: User;
    try { fetched = await queryClient.fetchQuery({ queryKey: ['me'], queryFn: authApi.me, staleTime: 0 }); }
    catch (error) { if (ticket !== epoch.current || !scopeActive.current) return null; throw error; }
    if (ticket !== epoch.current || !sessionRef.current) return null;
    const currentUser = mergeAvatarVersion(userRef.current, fetched);
    userRef.current = currentUser; setUser(currentUser);
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
  const updateUser = useCallback((incoming: User, actor: SessionActor) => {
    if (!isActorCurrent(actor) || incoming.id !== actor.userId) return;
    const next = mergeAvatarVersion(userRef.current, incoming);
    userRef.current = next; setUser(next);
    if (sessionRef.current) replaceSession({ ...sessionRef.current, user: next });
    queryClient.setQueryData(['me'], next);
  }, [isActorCurrent, queryClient, replaceSession]);
  const refreshAvatar = useAvatarRefresh(user, refreshUser, isLoaded && Boolean(session));

  const runTerminal = useCallback((operation: 'logout' | 'logoutAll' | 'password', actor: SessionActor, input?: ChangePasswordInput): Promise<void> => {
    if (!isActorCurrent(actor)) return Promise.reject(Error('A sessão mudou. Abra as configurações novamente.'));
    if (terminal.current?.epoch === actor.epoch) return terminal.current.operation === operation ? terminal.current.promise : Promise.reject(Error('Aguarde a operação atual.'));
    const promise = (async () => {
      const currentActor = () => isActorCurrent(actor);
      const send = async () => {
        if (!currentActor() || !sessionRef.current) throw Error('A sessão mudou.');
        if (operation === 'logout') await sessionTransport.signOut(sessionRef.current, actor, currentActor);
        else if (operation === 'logoutAll') await sessionTransport.signOutAll(sessionRef.current, actor, currentActor);
        else await sessionTransport.changePassword(sessionRef.current, input!, actor, currentActor);
      };
      try { await send(); }
      catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        // Terminal adapters do not use the Axios refresh interceptor or hold the cookie lock here.
        if (status !== 401 || !currentActor() || !await refreshSession()) throw error;
        await send();
      }
      const notice = operation === 'password' ? 'Senha atualizada. Entre novamente para continuar.' : 'Sua sessão foi encerrada.';
      if (!currentActor()) {
        if (endedActor.current?.userId === actor.userId && endedActor.current.epoch === actor.epoch && endedActor.current.afterEpoch === epoch.current && !sessionRef.current) {
          setSessionNotice(old => old?.includes('armazenamento') ? `${notice} ${old}` : notice);
        }
        return;
      }
      const cleanupEpoch = actor.epoch + 1;
      try { await clearSession(); if (epoch.current === cleanupEpoch) setSessionNotice(notice); }
      catch {
        if (epoch.current === cleanupEpoch) setSessionNotice('Sua sessão foi encerrada no servidor, mas não foi possível limpar o armazenamento local. Entre novamente ou reinicie o aplicativo.');
      }
    })();
    terminal.current = { epoch: actor.epoch, operation, promise };
    void promise.finally(() => { if (terminal.current?.promise === promise) terminal.current = null; }).catch(() => {});
    return promise;
  }, [clearSession, isActorCurrent, refreshSession]);
  const signOut = useCallback((actor?: SessionActor) => {
    const captured = actor ?? captureActor();
    return captured ? runTerminal('logout', captured) : Promise.reject(Error('Sessão indisponível. Entre novamente.'));
  }, [captureActor, runTerminal]);
  const signOutAll = useCallback((actor: SessionActor) => runTerminal('logoutAll', actor), [runTerminal]);
  const changePassword = useCallback((input: ChangePasswordInput, actor: SessionActor) => runTerminal('password', actor, input), [runTerminal]);
  const endRevokedSession = useCallback(async (actor: SessionActor) => {
    if (!isActorCurrent(actor)) return;
    const afterEpoch = actor.epoch + 1;
    try {
      await clearSession();
      if (epoch.current === afterEpoch) setSessionNotice(old => old?.startsWith('Senha atualizada.') ? old : 'Sua sessão foi encerrada. Entre novamente para continuar.');
    } catch {
      if (epoch.current === afterEpoch) setSessionNotice('Sua sessão foi encerrada no servidor, mas não foi possível limpar o armazenamento local. Entre novamente ou reinicie o aplicativo.');
    }
  }, [clearSession, isActorCurrent]);

  useLayoutEffect(() => {
    configureApiSession({ getAccessToken: getToken, refresh: refreshSession, onUnauthorized: clearSession,
      // Stable during bootstrap and refresh; every login/logout changes the local epoch.
      // This is request correlation only, never authentication.
      getIdentity: () => sessionRef.current ? `session:${epoch.current}` : null });
  }, [clearSession, getToken, refreshSession]);

  useEffect(() => {
    let active = true;
    scopeActive.current = true;

    const hydrate = async () => {
      const ticket = epoch.current;
      const current = () => active && ticket === epoch.current;
      try {
        const restored = await sessionTransport.restore();
        if (!restored || !current()) return;
        replaceSession(restored);
        if (restored.user) { userRef.current = restored.user; setUser(restored.user); }

        if (restored.expiresAt <= Date.now() + 60_000) {
          try {
            if (!await refreshSession()) return;
          } catch {
            return;
          }
        }
        if (!restored.user) {
          const currentUser = await authApi.me();
          if (!active || ticket !== epoch.current) return;
          userRef.current = currentUser; setUser(currentUser);
          replaceSession({ ...sessionRef.current!, user: currentUser });
        }
      } catch (error) {
        if (active && ticket === epoch.current) {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 401) await clearSession().catch(() => { setSessionNotice('Não foi possível restaurar sua sessão. Entre novamente.'); });
          else setSessionNotice('Não foi possível restaurar sua sessão agora. Confira a conexão e reabra o aplicativo para tentar novamente.');
        }
      } finally {
        if (active) setIsLoaded(true);
      }
    };

    void hydrate();
    return () => { active = false; scopeActive.current = false; };
  }, [clearSession, refreshSession, replaceSession]);

  const value = useMemo<SessionContextValue>(() => ({
    isLoaded,
    isSignedIn: Boolean(session && user),
    user,
    getToken,
    getSessionScope,
    establishSession,
    refreshSession,
    rebindSession,
    refreshUser,
    refreshAvatar,
    updateAvatar,
    captureActor, isActorCurrent, updateUser,
    signOut, signOutAll, changePassword, sessionNotice, endRevokedSession
  }), [establishSession, getToken, getSessionScope, isLoaded, refreshSession, rebindSession, refreshUser, refreshAvatar, updateAvatar, captureActor, isActorCurrent, updateUser, session, signOut, signOutAll, changePassword, sessionNotice, endRevokedSession, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession deve ser usado dentro de SessionProvider.');
  return context;
}
