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
import type { Match } from '../../../types/api';

const book = { id: 'other-book', title: 'Dom Casmurro', authors: ['Autora'], subjects: [], availability: 'AVAILABLE', owner: { id: 'other-reader', name: 'Ana' }, images: [] };
const match: Match = { id: 'match', status: 'ACTIVE', otherUser: { id: 'other-reader', name: 'Ana', avatarUrl: null, avatarUrlExpiresAt: null, avatarVersion: 0, city: null }, conversationId: 'conversation', createdAt: '2026-10-14T12:00:00Z', updatedAt: '2026-10-14T12:00:00Z' };
const clients: QueryClient[] = [];
type Origin = 'Discover' | 'Likes';

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
    await act(async () => { finish(); });
    expect(screen.queryByRole('dialog')).toBeNull();
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
