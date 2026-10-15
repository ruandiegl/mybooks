// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), alert: vi.fn(), navigate: vi.fn() }));
const viewer = vi.hoisted(() => ({ id: 'reader', epoch: 0, focused: true }));
vi.hoisted(() => {
  window.matchMedia = (media: string) => ({ matches: true, media, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => true });
});
vi.mock('react-native', async () => ({
  ...(await import('react-native-web')),
  useWindowDimensions: () => ({ width: 375, height: 812, fontScale: 1, scale: 1 }),
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(true), addEventListener: () => ({ remove() {} }) }
}));
vi.mock('react-native-safe-area-context', async () => ({ SafeAreaView: (await import('react-native-web')).View, useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('expo-crypto', () => ({ randomUUID: () => '40000000-0000-4000-8000-000000000004' }));
vi.mock('@react-navigation/native', () => ({ useIsFocused: () => viewer.focused, useNavigation: () => ({ navigate: boundary.navigate }) }));
vi.mock('../../../services/api', () => ({ api: { get: boundary.get, post: boundary.post }, apiErrorMessage: () => 'Falha de conexão' }));
vi.mock('../../../services/notice', () => ({ Alert: { alert: boundary.alert } }));
vi.mock('../../../providers/SessionProvider', () => ({ useSession: () => ({ user: { id: viewer.id, emailVerifiedAt: '2026-10-14' }, isSignedIn: true, getSessionScope: () => ({ userId: viewer.id, epoch: viewer.epoch }) }) }));
vi.mock('../../premium/usePremiumStatus', () => ({ usePremiumStatus: () => ({ data: { serverNow: '2026-10-14T12:00:00Z', eligible: false, trialState: 'ACTIVE', trialStartedAt: '2026-10-14T12:00:00Z', trialEndsAt: '2026-11-13T12:00:00Z', promptMode: null, benefits: { seeReceivedLikes: true, unlimitedLikes: true, dailyLikeLimit: null } }, isLoading: false, isError: false, isTrialLocallyExpired: false, refetch: vi.fn() }) }));
vi.mock('../../premium/PremiumOfferProvider', () => ({ usePremiumOffer: () => ({ openOffer: vi.fn() }) }));

import { Discover } from '../../../pages/Discover';
import { Likes } from '../../../pages/Likes';
import type { Match, Paginated } from '../../../types/api';
import type { ReceivedLike } from '../../../types/likes';
import type { InfiniteData } from '@tanstack/react-query';

const book = { id: 'other-book', title: 'Dom Casmurro', authors: ['Autora'], subjects: [], availability: 'AVAILABLE', owner: { id: 'other-reader', name: 'Ana' }, images: [] };
const match: Match = { id: 'match', status: 'ACTIVE', otherUser: { id: 'other-reader', name: 'Ana', avatarUrl: null, avatarUrlExpiresAt: null, avatarVersion: 0, city: null }, conversationId: 'conversation', createdAt: '2026-10-14T12:00:00Z', updatedAt: '2026-10-14T12:00:00Z' };
const clients: QueryClient[] = [];
type Origin = 'Discover' | 'Likes';

function currentLikeButton(origin: Origin) {
  return screen.getAllByRole('button', { name: origin === 'Discover' ? 'Gostei do livro' : 'Curtir de volta o livro de Ana' })[0];
}

function tree(origin: Origin, client: QueryClient) {
  return <QueryClientProvider client={client}>{origin === 'Discover' ? <Discover /> : <Likes navigation={{ navigate: boundary.navigate } as any} route={{} as any} />}</QueryClientProvider>;
}
async function host(origin: Origin) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  clients.push(client);
  const mounted = render(tree(origin, client));
  const trigger = await screen.findByRole('button', { name: origin === 'Discover' ? 'Gostei do livro' : 'Curtir de volta o livro de Ana' });
  await act(async () => {});
  return { client, mounted, trigger };
}
beforeEach(() => {
  viewer.id = 'reader'; viewer.epoch = 0; viewer.focused = true;
  boundary.get.mockReset(); boundary.post.mockReset(); boundary.alert.mockReset(); boundary.navigate.mockReset();
  boundary.get.mockImplementation(async (url: string) => {
    if (url === '/api/v1/discover') return { data: { data: { items: [book], pageInfo: { hasNextPage: false, nextCursor: null } } } };
    if (url === '/api/v1/likes/received/count') return { data: { data: { count: 1 } } };
    if (url === '/api/v1/likes/received/books') return { data: { data: [{ id: 'own-book', title: 'Meu livro' }] } };
    if (url === '/api/v1/likes/received') return { data: { data: { items: [{ id: 'received-like', actor: book.owner, actorBook: { id: book.id, title: book.title }, book: { id: 'own-book', title: 'Meu livro' }, likedAt: '2026-10-14T12:00:00Z' }], hasMore: false, nextCursor: null } } };
    throw new Error('Unexpected request: ' + url);
  });
  boundary.post.mockResolvedValue({ data: { data: { interaction: { id: 'interaction' }, match } } });
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); });

describe.each<Origin>(['Discover', 'Likes'])('match feedback from %s', origin => {
  it('removes the matched actor from every cached received page while the refresh is pending, without touching sent likes', async () => {
    const { client } = await host(origin);
    const ana: ReceivedLike = { id: 'received-ana', actor: { id: 'other-reader', name: 'Ana' }, actorBook: { id: book.id, title: book.title }, book: { id: 'own-book', title: 'Meu livro' }, likedAt: '2026-10-14T12:00:00Z' };
    const bia: ReceivedLike = { ...ana, id: 'received-bia', actor: { id: 'unmatched-reader', name: 'Bia' } };
    const cached: InfiniteData<Paginated<ReceivedLike>> = { pages: [
      { items: [ana, bia], pageInfo: { hasNextPage: true, nextCursor: 'cursor' } },
      { items: [{ ...ana, id: 'received-ana-2' }], pageInfo: { hasNextPage: false, nextCursor: null } }
    ], pageParams: ['', 'cursor'] };
    const filteredKey = ['likes', 'received', 'asc', 'own-book'];
    const sent = { pages: [{ items: [{ id: 'sent-like' }], pageInfo: { hasNextPage: false, nextCursor: null } }], pageParams: [''] };
    await act(async () => {
      client.setQueryData(['likes', 'received', 'desc', undefined], cached);
      client.setQueryData(filteredKey, cached);
      client.setQueryData(['likes', 'sent', 'desc'], sent);
    });
    boundary.get.mockImplementation(() => new Promise(() => {}));
    fireEvent.click(currentLikeButton(origin));
    await screen.findByRole('dialog', { name: 'Deu match!' });
    for (const key of [['likes', 'received', 'desc', undefined], filteredKey]) {
      const data = client.getQueryData<InfiniteData<Paginated<ReceivedLike>>>(key)!;
      expect(data.pages.flatMap(page => page.items).map(item => item.id)).toEqual(['received-bia']);
      expect(data.pageParams).toEqual(['', 'cursor']);
    }
    expect(client.getQueryData(['likes', 'sent', 'desc'])).toEqual(sent);
  });

  it.each(['no-match', 'archived-match', 'error'])('keeps received likes on %s', async outcome => {
    const { client } = await host(origin);
    const key = ['likes', 'received', 'desc', undefined];
    const cached: InfiniteData<Paginated<ReceivedLike>> = { pages: [{ items: [{
      id: 'received-ana', actor: { id: 'other-reader', name: 'Ana' },
      actorBook: { id: book.id, title: book.title }, book: { id: 'own-book', title: 'Meu livro' }, likedAt: '2026-10-14T12:00:00Z'
    }], pageInfo: { hasNextPage: false, nextCursor: null } }], pageParams: [''] };
    await act(async () => { client.setQueryData(key, cached); });
    boundary.get.mockImplementation(() => new Promise(() => {}));
    if (outcome === 'error') boundary.post.mockRejectedValueOnce(new Error('offline'));
    else boundary.post.mockResolvedValueOnce({ data: { data: { interaction: { id: 'interaction' }, match: outcome === 'archived-match' ? { ...match, status: 'ARCHIVED' } : null } } });
    fireEvent.click(currentLikeButton(origin));
    await waitFor(() => expect(boundary.post).toHaveBeenCalledTimes(1));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(client.getQueryData(key)).toEqual(cached);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ignores a pre-match response for an inactive received filter after removing the matched actor', async () => {
    const { trigger, client } = await host(origin);
    const filter = ['likes', 'received', 'asc', 'inactive-filter'];
    const cached: InfiniteData<Paginated<ReceivedLike>> = { pages: [{ items: [{
      id: 'stale-ana', actor: { id: 'other-reader', name: 'Ana' }, actorBook: { id: book.id, title: book.title },
      book: { id: 'own-book', title: 'Meu livro' }, likedAt: '2026-10-14T12:00:00Z'
    }], pageInfo: { hasNextPage: false, nextCursor: null } }], pageParams: [''] };
    client.setQueryData(filter, cached);
    let completeOldRequest!: () => void;
    let requestStarted!: () => void;
    const started = new Promise<void>(resolve => { requestStarted = resolve; });
    const staleRequest = client.fetchQuery({ queryKey: filter, staleTime: 0, queryFn: () => {
      requestStarted();
      return new Promise<typeof cached>(resolve => { completeOldRequest = () => resolve(cached); });
    } }).catch(() => undefined);
    await started;
    boundary.get.mockImplementation(() => new Promise(() => {}));
    fireEvent.click(trigger);
    await screen.findByRole('dialog', { name: 'Deu match!' });
    expect(client.getQueryData<typeof cached>(filter)?.pages[0].items).toEqual([]);
    await act(async () => { completeOldRequest(); await staleRequest; });
    expect(client.getQueryData<typeof cached>(filter)?.pages[0].items).toEqual([]);
  });

  it('rechecks the session after awaiting query cancellation', async () => {
    const { trigger, client, mounted } = await host(origin);
    const cancel = client.cancelQueries.bind(client);
    let started = false;
    let resume!: () => void;
    const pause = new Promise<void>(resolve => { resume = resolve; });
    vi.spyOn(client, 'cancelQueries').mockImplementation(async (filters, options) => {
      await cancel(filters, options); started = true; await pause;
    });
    fireEvent.click(trigger);
    await waitFor(() => expect(started).toBe(true));
    viewer.id = 'next-reader'; viewer.epoch++;
    mounted.rerender(tree(origin, client));
    const filter = ['likes', 'received', 'asc', 'new-session'];
    const cached: InfiniteData<Paginated<ReceivedLike>> = { pages: [{ items: [{
      id: 'new-session-like', actor: { id: 'other-reader', name: 'Ana' }, actorBook: { id: book.id, title: book.title },
      book: { id: 'new-session', title: 'Livro da nova sessão' }, likedAt: '2026-10-14T12:00:00Z'
    }], pageInfo: { hasNextPage: false, nextCursor: null } }], pageParams: [''] };
    client.setQueryData(filter, cached);
    await act(async () => { resume(); });
    expect(client.getQueryData(filter)).toEqual(cached);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens an in-app dialog after a confirmed reciprocal like', async () => {
    const { trigger } = await host(origin);
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Deu match!' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Deu match!' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ir para Mensagens' })).toBeTruthy();
    expect(boundary.alert).not.toHaveBeenCalled();
    expect(boundary.post).toHaveBeenCalledWith('/api/v1/interactions', expect.objectContaining({ targetBookId: 'other-book', action: 'LIKE' }));
  });
  it('dismisses with Continue without another interaction or navigation', async () => {
    const { trigger } = await host(origin);
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(boundary.post).toHaveBeenCalledTimes(1);
    expect(boundary.navigate).not.toHaveBeenCalled();
  });
  it('dismisses and navigates to the Messages tab', async () => {
    const { trigger } = await host(origin);
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: 'Ir para Mensagens' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(boundary.navigate).toHaveBeenCalledWith('Main', { screen: 'Messages' });
  });
  it('does not display a delayed match after the viewer changes', async () => {
    let finish!: () => void;
    boundary.post.mockImplementation(() => new Promise(resolve => { finish = () => resolve({ data: { data: { interaction: { id: 'interaction' }, match } } }); }));
    const { trigger, mounted, client } = await host(origin);
    fireEvent.click(trigger);
    await act(async () => {});
    viewer.id = 'next-reader'; viewer.epoch++;
    mounted.rerender(tree(origin, client));
    const nextSessionKey = ['likes', 'received', 'asc', 'next-session-book'];
    const nextSessionLikes: InfiniteData<Paginated<ReceivedLike>> = { pages: [{ items: [{
      id: 'next-session-like', actor: { id: 'other-reader', name: 'Ana' }, actorBook: { id: book.id, title: book.title },
      book: { id: 'next-session-book', title: 'Livro da nova sessão' }, likedAt: '2026-10-14T12:00:00Z'
    }], pageInfo: { hasNextPage: false, nextCursor: null } }], pageParams: [''] };
    client.setQueryData(nextSessionKey, nextSessionLikes);
    await act(async () => { finish(); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(client.getQueryData(nextSessionKey)).toEqual(nextSessionLikes);
    expect(boundary.navigate).not.toHaveBeenCalled();
  });
  it.each(['close', 'backdrop', 'Escape'])('dismisses using %s without changing the saved like', async control => {
    const { trigger } = await host(origin);
    fireEvent.click(trigger);
    await screen.findByRole('dialog');
    if (control === 'close') fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso de match' }));
    else if (control === 'backdrop') fireEvent.click(screen.getByTestId('match-sheet-backdrop'));
    else fireEvent.keyUp(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(boundary.post).toHaveBeenCalledTimes(1);
    expect(boundary.navigate).not.toHaveBeenCalled();
  });
  it('puts keyboard focus on the close control', async () => {
    const { trigger } = await host(origin);
    fireEvent.click(trigger);
    const close = await screen.findByRole('button', { name: 'Fechar aviso de match' });
    await waitFor(() => expect(document.activeElement).toBe(close));
  });
  it('closes a displayed match when the session changes', async () => {
    const { trigger, client, mounted } = await host(origin);
    fireEvent.click(trigger);
    await screen.findByRole('dialog');
    viewer.epoch++;
    mounted.rerender(tree(origin, client));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('does not reopen an old match when returning to the tab', async () => {
    const { trigger, client, mounted } = await host(origin);
    fireEvent.click(trigger);
    await screen.findByRole('dialog');
    viewer.focused = false;
    mounted.rerender(tree(origin, client));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    viewer.focused = true;
    mounted.rerender(tree(origin, client));
    await act(async () => {});
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boundary.post).toHaveBeenCalledTimes(1);
  });
  it('does not queue a delayed match notice while the tab is unfocused', async () => {
    let finish!: () => void;
    boundary.post.mockImplementation(() => new Promise(resolve => { finish = () => resolve({ data: { data: { interaction: { id: 'interaction' }, match } } }); }));
    const { trigger, client, mounted } = await host(origin);
    fireEvent.click(trigger);
    await act(async () => {});
    viewer.focused = false;
    mounted.rerender(tree(origin, client));
    await act(async () => { finish(); });
    await waitFor(() => expect(boundary.post).toHaveBeenCalledTimes(1));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    viewer.focused = true;
    mounted.rerender(tree(origin, client));
    await act(async () => {});
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boundary.navigate).not.toHaveBeenCalled();
  });
});

it('keeps the match accessible after liking the last book in Discover', async () => {
  const { trigger } = await host('Discover');
  boundary.get.mockResolvedValue({ data: { data: { items: [], pageInfo: { hasNextPage: false, nextCursor: null } } } });
  fireEvent.click(trigger);
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByText('Você chegou ao fim por agora');
});

it('refreshes received likes on returning to the tab after a match on another device', async () => {
  const { mounted, client } = await host('Likes');
  viewer.focused = false;
  mounted.rerender(tree('Likes', client));
  boundary.get.mockImplementation(async (url: string) => {
    if (url === '/api/v1/likes/received') return { data: { data: { items: [], nextCursor: null, hasMore: false } } };
    if (url === '/api/v1/likes/received/books') return { data: { data: [] } };
    if (url === '/api/v1/likes/received/count') return { data: { data: { count: 0 } } };
    throw new Error('Unexpected request: ' + url);
  });
  viewer.focused = true;
  mounted.rerender(tree('Likes', client));
  await screen.findByText('Nenhuma curtida ainda');
  expect(screen.queryByRole('button', { name: 'Curtir de volta o livro de Ana' })).toBeNull();
});
