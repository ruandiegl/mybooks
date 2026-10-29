import type { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import type { MessagePages } from './messageCache';

export type ChatConnectionState = 'connecting' | 'connected' | 'offline';
export type MatchRemovedEvent = { matchId: string; conversationId: string };

type RealtimeOptions = {
  refreshSession?: () => Promise<boolean>;
  refreshConversations?: () => Promise<Array<{ id: string; matchId: string }>>;
  onConnectionState?: (state: ChatConnectionState) => void;
  onMatchRemoved?: (event: MatchRemovedEvent) => void;
};

type JoinOptions = {
  socket: Socket;
  conversationId: string;
  refreshMembership: () => Promise<Array<{ id: string }>>;
  isConversationRemoved: (conversationId: string) => boolean;
  isActive: () => boolean;
  onJoinRequested?: () => void;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseMatchRemovedEvent(value: unknown): MatchRemovedEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Partial<MatchRemovedEvent>;
  if (typeof event.matchId !== 'string' || !uuidPattern.test(event.matchId)) return null;
  if (typeof event.conversationId !== 'string' || !uuidPattern.test(event.conversationId)) return null;
  return { matchId: event.matchId, conversationId: event.conversationId };
}

export function addPendingRemoval(pending: MatchRemovedEvent[], event: MatchRemovedEvent): MatchRemovedEvent[] {
  if (pending.some((item) => item.matchId === event.matchId)) return pending;
  return [...pending, event];
}

export function acknowledgePendingRemoval(pending: MatchRemovedEvent[], matchId: string): MatchRemovedEvent[] {
  return pending.filter((item) => item.matchId !== matchId);
}

export function bindChatRealtime(socket: Socket, queryClient: QueryClient, options: RealtimeOptions) {
  let active = true;
  let authRecoveryAttempted = false;
  let authRecoveryInProgress = false;
  const handledMatchIds = new Set<string>();
  const removedConversationIds = new Set<string>();
  let connectionEpoch = 0;

  const knownConversations = () => {
    const known = new Map<string, string>();
    const conversations = queryClient.getQueryData<Array<{ id: string; matchId: string }>>(['conversations']);
    for (const conversation of conversations ?? []) {
      if (uuidPattern.test(conversation.id) && uuidPattern.test(conversation.matchId)) {
        known.set(conversation.id, conversation.matchId);
      }
    }
    const matches = queryClient.getQueryData<Array<{ id: string; conversationId?: string | null }>>(['matches']);
    for (const match of matches ?? []) {
      if (match.conversationId && uuidPattern.test(match.conversationId) && uuidPattern.test(match.id)) {
        known.set(match.conversationId, match.id);
      }
    }
    for (const query of queryClient.getQueryCache().getAll()) {
      const [kind, conversationId] = query.queryKey;
      if ((kind === 'messages' || kind === 'exchange-book') && typeof conversationId === 'string' && uuidPattern.test(conversationId)) {
        // A contextual detail can be open without a cached conversation list.
        known.set(conversationId, known.get(conversationId) ?? conversationId);
      }
    }
    return known;
  };

  const invalidateConversationLists = () => {
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const onConnect = () => {
    if (!active) return;
    authRecoveryAttempted = false;
    authRecoveryInProgress = false;
    options.onConnectionState?.('connected');
    const refreshConversations = options.refreshConversations;
    if (!refreshConversations) {
      invalidateConversationLists();
      return;
    }
    const epoch = ++connectionEpoch;
    const known = knownConversations();
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
    void queryClient.invalidateQueries({ queryKey: ['conversations'], refetchType: 'none' });
    void refreshConversations().then((fresh) => {
      if (!active || epoch !== connectionEpoch) return;
      const presentIds = new Set(fresh.map((conversation) => conversation.id));
      for (const [conversationId, matchId] of known) {
        if (!presentIds.has(conversationId)) onMatchRemoved({ matchId, conversationId });
      }
      queryClient.setQueryData(['conversations'], fresh.filter((conversation) => !removedConversationIds.has(conversation.id)));
    }).catch(() => {
      if (active && epoch === connectionEpoch) {
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    });
  };

  const onDisconnect = () => {
    connectionEpoch += 1;
    if (active) options.onConnectionState?.('offline');
  };

  const onConnectError = (error: Error) => {
    if (!active) return;
    options.onConnectionState?.('offline');
    const refreshSession = options.refreshSession;
    if (error.message !== 'UNAUTHENTICATED' || !refreshSession || authRecoveryAttempted || authRecoveryInProgress) return;

    authRecoveryAttempted = true;
    authRecoveryInProgress = true;
    void refreshSession()
      .then((refreshed) => {
        if (active && refreshed) socket.connect();
      })
      .catch(() => {
        // Keep the next Socket.IO reconnect eligible to recover a transient refresh failure.
        if (active) authRecoveryAttempted = false;
      })
      .finally(() => { authRecoveryInProgress = false; });
  };

  const onMatchRemoved = (payload: unknown) => {
    if (!active) return;
    const event = parseMatchRemovedEvent(payload);
    if (!event || handledMatchIds.has(event.matchId) || removedConversationIds.has(event.conversationId)) return;

    handledMatchIds.add(event.matchId);
    removedConversationIds.add(event.conversationId);
    options.onMatchRemoved?.(event);
    invalidateConversationLists();

    const messagesKey = ['messages', event.conversationId] as const;
    const contextualBooksKey = ['exchange-book', event.conversationId] as const;
    void Promise.allSettled([
      queryClient.cancelQueries({ queryKey: messagesKey, exact: true }),
      queryClient.cancelQueries({ queryKey: contextualBooksKey })
    ]).then(() => {
      queryClient.removeQueries({ queryKey: messagesKey, exact: true });
      queryClient.removeQueries({ queryKey: contextualBooksKey });
    });
  };

  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  socket.on('connect_error', onConnectError);
  socket.on('match:removed', onMatchRemoved);

  return {
    handleMatchRemoved: onMatchRemoved,
    dispose() {
      if (!active) return;
      active = false;
      connectionEpoch += 1;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('match:removed', onMatchRemoved);
    },
    isConversationRemoved(conversationId: string) {
      return removedConversationIds.has(conversationId);
    }
  };
}

export function startChatRealtimeSession(socket: Socket, queryClient: QueryClient, options: RealtimeOptions) {
  const realtime = bindChatRealtime(socket, queryClient, options);
  let active = true;
  socket.connect();

  return {
    isConversationRemoved: realtime.isConversationRemoved,
    handleMatchRemoved: realtime.handleMatchRemoved,
    dispose() {
      if (!active) return;
      active = false;
      realtime.dispose();
      socket.close();
    }
  };
}

export async function joinConversationIfAuthorized(options: JoinOptions): Promise<boolean> {
  const canContinue = () => options.isActive() && options.socket.connected && !options.isConversationRemoved(options.conversationId);
  if (!canContinue()) return false;

  const conversations = await options.refreshMembership();
  if (!canContinue() || !conversations.some((conversation) => conversation.id === options.conversationId)) return false;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (joined: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(joined);
    };
    const timeout = setTimeout(() => finish(false), 8000);

    options.onJoinRequested?.();
    options.socket.emit('conversation:join', { conversationId: options.conversationId }, (response: { ok?: boolean } | undefined) => {
      if (!canContinue() || response?.ok !== true) {
        if (response?.ok === true && options.socket.connected) leaveConversation(options.socket, options.conversationId);
        finish(false);
        return;
      }

      options.socket.emit('message:read', { conversationId: options.conversationId }, (_read: { ok?: boolean } | undefined) => {
        if (!canContinue()) return;
      });
      finish(true);
    });
  });
}

export function leaveConversation(socket: Socket, conversationId: string) {
  if (socket.connected) socket.emit('conversation:leave', { conversationId });
}

export function updateMessagesIfConversationActive(
  queryClient: QueryClient,
  conversationId: string,
  isConversationRemoved: (conversationId: string) => boolean,
  updater: (old: MessagePages | undefined) => MessagePages | undefined
): boolean {
  if (isConversationRemoved(conversationId)) return false;
  queryClient.setQueryData<MessagePages>(['messages', conversationId], updater);
  return true;
}
