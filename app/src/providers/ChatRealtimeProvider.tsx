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

type ChatRealtimeContextValue = {
  socket: Socket | null;
  connectionState: ChatConnectionState;
  pendingMatchRemovals: MatchRemovedEvent[];
  acknowledgeMatchRemoved: (matchId: string) => void;
  isConversationRemoved: (conversationId: string) => boolean;
};

const ChatRealtimeContext = createContext<ChatRealtimeContextValue | null>(null);

export function ChatRealtimeProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { getToken, isSignedIn, refreshSession, user } = useSession();
  const sessionIdentity = isSignedIn ? user?.id ?? null : null;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<ChatConnectionState>('connecting');
  const [pendingMatchRemovals, setPendingMatchRemovals] = useState<MatchRemovedEvent[]>([]);
  const removedLookupRef = useRef<(conversationId: string) => boolean>(() => false);

  useEffect(() => {
    let active = true;
    let current: Socket | null = null;
    let detachRealtime: (() => void) | null = null;
    removedLookupRef.current = () => false;

    if (!sessionIdentity) {
      setSocket(null);
      setConnectionState('offline');
      setPendingMatchRemovals([]);
      return () => { active = false; };
    }

    setSocket(null);
    setConnectionState('connecting');
    setPendingMatchRemovals([]);

    void createChatSocket({ getToken }).then((created) => {
      if (!active) {
        created.close();
        return;
      }

      current = created;
      const realtime = startChatRealtimeSession(created, queryClient, {
        refreshSession,
        onConnectionState: setConnectionState,
        onMatchRemoved: (event) => setPendingMatchRemovals((pending) => addPendingRemoval(pending, event))
      });
      detachRealtime = realtime.dispose;
      removedLookupRef.current = realtime.isConversationRemoved;
      setSocket(created);
    }).catch(() => {
      if (active) setConnectionState('offline');
    });

    return () => {
      active = false;
      detachRealtime?.();
      removedLookupRef.current = () => false;
    };
  }, [getToken, queryClient, refreshSession, sessionIdentity]);

  const acknowledgeMatchRemoved = useCallback((matchId: string) => {
    setPendingMatchRemovals((pending) => acknowledgePendingRemoval(pending, matchId));
  }, []);
  const isConversationRemoved = useCallback((conversationId: string) => removedLookupRef.current(conversationId), []);

  const value = useMemo<ChatRealtimeContextValue>(() => ({
    socket,
    connectionState,
    pendingMatchRemovals,
    acknowledgeMatchRemoved,
    isConversationRemoved
  }), [acknowledgeMatchRemoved, connectionState, isConversationRemoved, pendingMatchRemovals, socket]);

  return <ChatRealtimeContext.Provider value={value}>{children}</ChatRealtimeContext.Provider>;
}

export function useChatRealtime() {
  const context = useContext(ChatRealtimeContext);
  if (!context) throw new Error('useChatRealtime deve ser usado dentro de ChatRealtimeProvider.');
  return context;
}
