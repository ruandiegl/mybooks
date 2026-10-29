import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useSession } from './SessionProvider';
import { useQueryClient } from '@tanstack/react-query';
import {
  acknowledgePendingRemoval,
  addPendingRemoval,
  startChatRealtimeSession,
  type ChatConnectionState,
  type MatchRemovedEvent
} from '../features/chat/realtime';
import { createChatSocket } from '../services/socket';
import { bindSocketSessionLifecycle } from '../services/socketSessionLifecycle';
import { accessSessionId } from '../features/auth/sessionActor';

type ChatRealtimeContextValue = {
  socket: Socket | null;
  connectionState: ChatConnectionState;
  pendingMatchRemovals: MatchRemovedEvent[];
  acknowledgeMatchRemoved: (matchId: string) => void;
  registerConfirmedMatchRemoved: (event: MatchRemovedEvent) => void;
  isConversationRemoved: (conversationId: string) => boolean;
};

const ChatRealtimeContext = createContext<ChatRealtimeContextValue | null>(null);

export function ChatRealtimeProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { getToken, getSessionScope, isSignedIn, user, captureActor, isActorCurrent, rebindSession, endRevokedSession } = useSession();
  const sessionScope = getSessionScope();
  const sessionIdentity = isSignedIn && user ? `${user.id}:${sessionScope.epoch}` : null;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<ChatConnectionState>('connecting');
  const [pendingMatchRemovals, setPendingMatchRemovals] = useState<MatchRemovedEvent[]>([]);
  const removedLookupRef = useRef<(conversationId: string) => boolean>(() => false);
  const confirmedRemovalHandlerRef = useRef<((event: MatchRemovedEvent) => void) | null>(null);
  const queuedConfirmedRemovalsRef = useRef<MatchRemovedEvent[]>([]);

  useEffect(() => {
    let active = true;
    let detachRealtime: (() => void) | null = null;
    let unbindSession: (() => void) | null = null;
    const actor = captureActor();
    let connectionSid: string | null = actor?.sessionId ?? null;
    removedLookupRef.current = () => false;
    confirmedRemovalHandlerRef.current = null;
    queuedConfirmedRemovalsRef.current = [];

    if (!sessionIdentity) {
      setSocket(null);
      setConnectionState('offline');
      setPendingMatchRemovals([]);
      return () => { active = false; };
    }

    setSocket(null);
    setConnectionState('connecting');
    setPendingMatchRemovals([]);

    void createChatSocket({ getToken, onToken: token => { connectionSid = token && actor ? accessSessionId(token, actor.userId) : null; } }).then((created) => {
      if (!active) {
        created.close();
        return;
      }

      unbindSession = bindSocketSessionLifecycle(created, {
        isCurrent: () => Boolean(actor && isActorCurrent(actor)),
        recover: rebindSession,
        onRevoked: async () => {
          const latest = captureActor();
          if (actor && latest?.sessionId === connectionSid && isActorCurrent(actor)) await endRevokedSession(latest);
        }
      });
      const realtime = startChatRealtimeSession(created, queryClient, {
        onConnectionState: setConnectionState,
        onMatchRemoved: (event) => setPendingMatchRemovals((pending) => addPendingRemoval(pending, event))
      });
      detachRealtime = realtime.dispose;
      removedLookupRef.current = realtime.isConversationRemoved;
      confirmedRemovalHandlerRef.current = realtime.handleMatchRemoved;
      for (const event of queuedConfirmedRemovalsRef.current) realtime.handleMatchRemoved(event);
      queuedConfirmedRemovalsRef.current = [];
      setSocket(created);
    }).catch(() => {
      if (active) setConnectionState('offline');
    });

    return () => {
      active = false;
      detachRealtime?.();
      unbindSession?.();
      removedLookupRef.current = () => false;
      confirmedRemovalHandlerRef.current = null;
    };
  }, [captureActor, endRevokedSession, getToken, isActorCurrent, queryClient, rebindSession, sessionIdentity]);

  const acknowledgeMatchRemoved = useCallback((matchId: string) => {
    setPendingMatchRemovals((pending) => acknowledgePendingRemoval(pending, matchId));
  }, []);
  const registerConfirmedMatchRemoved = useCallback((event: MatchRemovedEvent) => {
    const handler = confirmedRemovalHandlerRef.current;
    if (handler) {
      handler(event);
      return;
    }
    queuedConfirmedRemovalsRef.current = addPendingRemoval(queuedConfirmedRemovalsRef.current, event);
  }, []);
  const isConversationRemoved = useCallback((conversationId: string) => removedLookupRef.current(conversationId), []);

  const value = useMemo<ChatRealtimeContextValue>(() => ({
    socket,
    connectionState,
    pendingMatchRemovals,
    acknowledgeMatchRemoved,
    registerConfirmedMatchRemoved,
    isConversationRemoved
  }), [acknowledgeMatchRemoved, connectionState, isConversationRemoved, pendingMatchRemovals, registerConfirmedMatchRemoved, socket]);

  return <ChatRealtimeContext.Provider value={value}>{children}</ChatRealtimeContext.Provider>;
}

export function useChatRealtime() {
  const context = useContext(ChatRealtimeContext);
  if (!context) throw new Error('useChatRealtime deve ser usado dentro de ChatRealtimeProvider.');
  return context;
}
