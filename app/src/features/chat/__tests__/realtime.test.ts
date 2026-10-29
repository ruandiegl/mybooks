import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Socket } from 'socket.io-client';
import {
  acknowledgePendingRemoval,
  addPendingRemoval,
  bindChatRealtime,
  joinConversationIfAuthorized,
  leaveConversation,
  startChatRealtimeSession,
  updateMessagesIfConversationActive,
  type MatchRemovedEvent
} from '../realtime';

const removed: MatchRemovedEvent = {
  matchId: '11111111-1111-4111-8111-111111111111',
  conversationId: '22222222-2222-4222-8222-222222222222'
};

class FakeSocket {
  connected = false;
  connectCalls = 0;
  closeCalls = 0;
  listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  emitted: Array<{ event: string; args: unknown[] }> = [];

  on(event: string, listener: (...args: unknown[]) => void) {
    const listeners = this.listeners.get(event) || [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  off(event: string, listener: (...args: unknown[]) => void) {
    this.listeners.set(event, (this.listeners.get(event) || []).filter((item) => item !== listener));
    return this;
  }

  connect() {
    this.connectCalls += 1;
    this.connected = true;
    return this;
  }

  close() {
    this.closeCalls += 1;
    this.connected = false;
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    this.emitted.push({ event, args });
    const ack = args.at(-1);
    if (typeof ack === 'function') (ack as (response: unknown) => void)({ ok: true });
    return this;
  }

  fire(event: string, ...args: unknown[]) {
    for (const listener of this.listeners.get(event) || []) listener(...args);
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

describe('chat realtime lifecycle and cache effects', () => {
  let queryClient: QueryClient;
  let socket: FakeSocket;

  beforeEach(() => {
    queryClient = makeQueryClient();
    socket = new FakeSocket();
  });

  it('invalidates match and conversation lists after a connection is restored', () => {
    queryClient.setQueryData(['matches'], [{ id: 'match' }]);
    queryClient.setQueryData(['conversations'], [{ id: 'conversation' }]);
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshSession: async () => true });

    socket.fire('connect');

    expect(queryClient.getQueryState(['matches'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['conversations'])?.isInvalidated).toBe(true);
    realtime.dispose();
  });

  it('reconciles a removal missed while offline and purges an open contextual book', async () => {
    queryClient.setQueryData(['conversations'], [{ id: removed.conversationId, matchId: removed.matchId }]);
    queryClient.setQueryData(['messages', removed.conversationId], { pages: ['private messages'] });
    queryClient.setQueryData(['exchange-book', removed.conversationId, 'book-a'], { id: 'book-a' });
    const onMatchRemoved = vi.fn();
    const refreshConversations = vi.fn(async () => []);
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshConversations, onMatchRemoved });

    socket.fire('disconnect');
    socket.fire('connect');
    await vi.waitFor(() => expect(onMatchRemoved).toHaveBeenCalledExactlyOnceWith(removed));

    expect(refreshConversations).toHaveBeenCalledTimes(1);
    expect(realtime.isConversationRemoved(removed.conversationId)).toBe(true);
    expect(queryClient.getQueryData(['messages', removed.conversationId])).toBeUndefined();
    expect(queryClient.getQueryData(['exchange-book', removed.conversationId, 'book-a'])).toBeUndefined();
    expect(queryClient.getQueryData(['conversations'])).toEqual([]);
    realtime.dispose();
  });

  it('reconciles an opened contextual detail even when the conversation list cache is absent', async () => {
    queryClient.setQueryData(['exchange-book', removed.conversationId, 'book-a'], { id: 'book-a' });
    const onMatchRemoved = vi.fn();
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, {
      refreshConversations: async () => [], onMatchRemoved
    });

    socket.fire('connect');
    await vi.waitFor(() => expect(onMatchRemoved).toHaveBeenCalledTimes(1));

    expect(onMatchRemoved.mock.calls[0][0].conversationId).toBe(removed.conversationId);
    expect(queryClient.getQueryData(['exchange-book', removed.conversationId, 'book-a'])).toBeUndefined();
    socket.fire('match:removed', removed);
    expect(onMatchRemoved).toHaveBeenCalledTimes(1);
    realtime.dispose();
  });

  it('preserves known conversations when reconnect validation fails and retries on the next connection', async () => {
    queryClient.setQueryData(['conversations'], [{ id: removed.conversationId, matchId: removed.matchId }]);
    const refreshConversations = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([]);
    const onMatchRemoved = vi.fn();
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshConversations, onMatchRemoved });

    socket.fire('connect');
    await vi.waitFor(() => expect(refreshConversations).toHaveBeenCalledTimes(1));
    expect(onMatchRemoved).not.toHaveBeenCalled();
    expect(realtime.isConversationRemoved(removed.conversationId)).toBe(false);

    socket.fire('disconnect');
    socket.fire('connect');
    await vi.waitFor(() => expect(onMatchRemoved).toHaveBeenCalledTimes(1));
    expect(refreshConversations).toHaveBeenCalledTimes(2);
    realtime.dispose();
  });

  it('ignores a validation result from a connection that has since dropped', async () => {
    queryClient.setQueryData(['conversations'], [{ id: removed.conversationId, matchId: removed.matchId }]);
    let resolveFirst: (conversations: Array<{ id: string; matchId: string }>) => void = () => undefined;
    const refreshConversations = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce([{ id: removed.conversationId, matchId: removed.matchId }]);
    const onMatchRemoved = vi.fn();
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshConversations, onMatchRemoved });

    socket.fire('connect');
    socket.fire('disconnect');
    socket.fire('connect');
    await vi.waitFor(() => expect(refreshConversations).toHaveBeenCalledTimes(2));
    resolveFirst([]);
    await Promise.resolve();

    expect(onMatchRemoved).not.toHaveBeenCalled();
    expect(realtime.isConversationRemoved(removed.conversationId)).toBe(false);
    realtime.dispose();
  });

  it('does not restore a removed conversation from a late connection refresh', async () => {
    const surviving = {
      id: '33333333-3333-4333-8333-333333333333',
      matchId: '44444444-4444-4444-8444-444444444444'
    };
    queryClient.setQueryData(['conversations'], [{ id: removed.conversationId, matchId: removed.matchId }, surviving]);
    let resolveRefresh!: (conversations: Array<{ id: string; matchId: string }>) => void;
    const refreshConversations = vi.fn(() => new Promise<Array<{ id: string; matchId: string }>>((resolve) => { resolveRefresh = resolve; }));
    const onMatchRemoved = vi.fn();
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshConversations, onMatchRemoved });

    socket.fire('connect');
    expect(refreshConversations).toHaveBeenCalledOnce();
    socket.fire('match:removed', removed);
    resolveRefresh([{ id: removed.conversationId, matchId: removed.matchId }, surviving]);
    await vi.waitFor(() => expect(queryClient.getQueryData(['conversations'])).toEqual([surviving]));

    expect(onMatchRemoved).toHaveBeenCalledExactlyOnceWith(removed);
    expect(realtime.isConversationRemoved(removed.conversationId)).toBe(true);
    realtime.dispose();
  });

  it('records removal synchronously and cancels then removes only that conversation caches', async () => {
    queryClient.setQueryData(['matches'], [{ id: removed.matchId }]);
    queryClient.setQueryData(['conversations'], [{ id: removed.conversationId }]);
    queryClient.setQueryData(['messages', removed.conversationId], { pages: ['messages'] });
    queryClient.setQueryData(['exchange-book', removed.conversationId, 'book-a'], { id: 'book-a' });
    queryClient.setQueryData(['messages', '33333333-3333-4333-8333-333333333333'], { pages: ['other'] });
    queryClient.setQueryData(['exchange-book', '33333333-3333-4333-8333-333333333333', 'book-b'], { id: 'book-b' });
    const onMatchRemoved = vi.fn();
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshSession: async () => true, onMatchRemoved });

    socket.fire('match:removed', removed);
    expect(realtime.isConversationRemoved(removed.conversationId)).toBe(true);
    socket.fire('match:removed', removed);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onMatchRemoved).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryState(['matches'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['conversations'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(['messages', removed.conversationId])).toBeUndefined();
    expect(queryClient.getQueryData(['exchange-book', removed.conversationId, 'book-a'])).toBeUndefined();
    expect(queryClient.getQueryData(['messages', '33333333-3333-4333-8333-333333333333'])).toEqual({ pages: ['other'] });
    expect(queryClient.getQueryData(['exchange-book', '33333333-3333-4333-8333-333333333333', 'book-b'])).toEqual({ id: 'book-b' });
    realtime.dispose();
  });

  it('applies an HTTP-confirmed removal through the same deduplicated event path', async () => {
    queryClient.setQueryData(['messages', removed.conversationId], { pages: ['messages'] });
    const onMatchRemoved = vi.fn();
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshSession: async () => true, onMatchRemoved });

    socket.fire('match:removed', removed);
    realtime.handleMatchRemoved(removed);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onMatchRemoved).toHaveBeenCalledTimes(1);
    expect(realtime.isConversationRemoved(removed.conversationId)).toBe(true);
    expect(queryClient.getQueryData(['messages', removed.conversationId])).toBeUndefined();
    realtime.dispose();
  });

  it('keeps HTTP-confirmed removal feedback and cache cleanup when the socket is offline', async () => {
    socket.connected = false;
    queryClient.setQueryData(['matches'], [{ id: removed.matchId }]);
    queryClient.setQueryData(['conversations'], [{ id: removed.conversationId }]);
    queryClient.setQueryData(['messages', removed.conversationId], { pages: ['messages'] });
    const onMatchRemoved = vi.fn();
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshSession: async () => true, onMatchRemoved });

    realtime.handleMatchRemoved(removed);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onMatchRemoved).toHaveBeenCalledExactlyOnceWith(removed);
    expect(realtime.isConversationRemoved(removed.conversationId)).toBe(true);
    expect(queryClient.getQueryState(['matches'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['conversations'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(['messages', removed.conversationId])).toBeUndefined();

    socket.fire('match:removed', removed);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onMatchRemoved).toHaveBeenCalledExactlyOnceWith(removed);
    realtime.dispose();
  });

  it('ignores malformed removal events', () => {
    const onMatchRemoved = vi.fn();
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshSession: async () => true, onMatchRemoved });

    socket.fire('match:removed', { matchId: 'not-a-uuid', conversationId: removed.conversationId });

    expect(onMatchRemoved).not.toHaveBeenCalled();
    expect(realtime.isConversationRemoved(removed.conversationId)).toBe(false);
    realtime.dispose();
  });

  it('refreshes authentication once per failed connection cycle and retries once', async () => {
    let resolveRefresh: (value: boolean) => void = () => undefined;
    const refreshSession = vi.fn(() => new Promise<boolean>((resolve) => { resolveRefresh = resolve; }));
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshSession });

    socket.fire('connect_error', new Error('UNAUTHENTICATED'));
    socket.fire('connect_error', new Error('UNAUTHENTICATED'));
    expect(refreshSession).toHaveBeenCalledTimes(1);
    resolveRefresh(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(socket.connectCalls).toBe(1);

    socket.fire('connect');
    socket.fire('connect_error', new Error('UNAUTHENTICATED'));
    expect(refreshSession).toHaveBeenCalledTimes(2);
    realtime.dispose();
  });

  it('retries session refresh after a transient refresh failure', async () => {
    const refreshSession = vi.fn()
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValueOnce(true);
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshSession });

    socket.fire('connect_error', new Error('UNAUTHENTICATED'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(refreshSession).toHaveBeenCalledTimes(1);

    socket.fire('connect_error', new Error('UNAUTHENTICATED'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(refreshSession).toHaveBeenCalledTimes(2);
    expect(socket.connectCalls).toBe(1);
    realtime.dispose();
  });

  it('removes only its own listeners when the session ends', () => {
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshSession: async () => true });
    expect(socket.listeners.get('match:removed')).toHaveLength(1);

    realtime.dispose();

    expect([...socket.listeners.values()].flat()).toHaveLength(0);
  });

  it('opens one realtime connection and closes it with its scoped listeners on session end', () => {
    const session = startChatRealtimeSession(socket as unknown as Socket, queryClient, { refreshSession: async () => true });

    expect(socket.connectCalls).toBe(1);
    expect(socket.connected).toBe(true);
    expect(socket.listeners.get('match:removed')).toHaveLength(1);

    session.dispose();

    expect(socket.closeCalls).toBe(1);
    expect(socket.connected).toBe(false);
    expect([...socket.listeners.values()].flat()).toHaveLength(0);
  });

  it('deduplicates pending notices and acknowledges only the selected match', () => {
    const another: MatchRemovedEvent = {
      matchId: '44444444-4444-4444-8444-444444444444',
      conversationId: '55555555-5555-4555-8555-555555555555'
    };
    const pending = addPendingRemoval(addPendingRemoval([], removed), removed);
    const withTwo = addPendingRemoval(pending, another);

    expect(withTwo).toEqual([removed, another]);
    expect(acknowledgePendingRemoval(withTwo, removed.matchId)).toEqual([another]);
    expect(acknowledgePendingRemoval([another], removed.matchId)).toEqual([another]);
  });

  it('does not create message cache data from a late callback after removal', () => {
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshSession: async () => true });
    socket.fire('match:removed', removed);

    const wrote = updateMessagesIfConversationActive(queryClient, removed.conversationId, realtime.isConversationRemoved, () => ({
      pages: [{ items: [], pageInfo: { hasNextPage: false } }],
      pageParams: ['']
    }));

    expect(wrote).toBe(false);
    expect(queryClient.getQueryData(['messages', removed.conversationId])).toBeUndefined();
    realtime.dispose();
  });

  it('aborts an in-flight messages request before removing its cache', async () => {
    let requestSignal: AbortSignal | undefined;
    const request = queryClient.fetchQuery({
      queryKey: ['messages', removed.conversationId],
      queryFn: ({ signal }) => new Promise<unknown>((_resolve, reject) => {
        requestSignal = signal;
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      })
    });
    void request.catch(() => undefined);
    await Promise.resolve();
    const realtime = bindChatRealtime(socket as unknown as Socket, queryClient, { refreshSession: async () => true });

    socket.fire('match:removed', removed);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requestSignal?.aborted).toBe(true);
    expect(queryClient.getQueryData(['messages', removed.conversationId])).toBeUndefined();
    realtime.dispose();
  });

  it('joins only after membership is confirmed and rechecks removal after the fetch', async () => {
    const membershipSocket = new FakeSocket();
    membershipSocket.connected = true;
    const notMember = await joinConversationIfAuthorized({
      socket: membershipSocket as unknown as Socket,
      conversationId: removed.conversationId,
      refreshMembership: async () => [],
      isConversationRemoved: () => false,
      isActive: () => true
    });
    expect(notMember).toBe(false);
    expect(membershipSocket.emitted).toEqual([]);

    let resolveMembership: (value: Array<{ id: string }>) => void = () => undefined;
    let wasRemoved = false;
    const pendingJoin = joinConversationIfAuthorized({
      socket: membershipSocket as unknown as Socket,
      conversationId: removed.conversationId,
      refreshMembership: () => new Promise((resolve) => { resolveMembership = resolve; }),
      isConversationRemoved: () => wasRemoved,
      isActive: () => true
    });
    wasRemoved = true;
    resolveMembership([{ id: removed.conversationId }]);
    expect(await pendingJoin).toBe(false);
    expect(membershipSocket.emitted).toEqual([]);
  });

  it('joins and emits a read only after confirmed membership', async () => {
    const membershipSocket = new FakeSocket();
    membershipSocket.connected = true;
    const joined = await joinConversationIfAuthorized({
      socket: membershipSocket as unknown as Socket,
      conversationId: removed.conversationId,
      refreshMembership: async () => [{ id: removed.conversationId }],
      isConversationRemoved: () => false,
      isActive: () => true
    });

    expect(joined).toBe(true);
    expect(membershipSocket.emitted.map(({ event }) => event)).toEqual(['conversation:join', 'message:read']);

    leaveConversation(membershipSocket as unknown as Socket, removed.conversationId);
    expect(membershipSocket.emitted.at(-1)).toMatchObject({ event: 'conversation:leave', args: [{ conversationId: removed.conversationId }] });
  });

  it('revalidates membership for each reconnect before joining again', async () => {
    const membershipSocket = new FakeSocket();
    membershipSocket.connected = true;
    const refreshMembership = vi.fn(async () => [{ id: removed.conversationId }]);
    const options = {
      socket: membershipSocket as unknown as Socket,
      conversationId: removed.conversationId,
      refreshMembership,
      isConversationRemoved: () => false,
      isActive: () => true
    };

    expect(await joinConversationIfAuthorized(options)).toBe(true);
    membershipSocket.emitted = [];
    expect(await joinConversationIfAuthorized(options)).toBe(true);

    expect(refreshMembership).toHaveBeenCalledTimes(2);
    expect(membershipSocket.emitted.map(({ event }) => event)).toEqual(['conversation:join', 'message:read']);
  });
});
