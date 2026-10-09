// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), alert: vi.fn() }));
vi.hoisted(() => {
  window.matchMedia = (media: string) => ({ matches: false, media, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => true });
});
vi.mock('react-native', async () => await import('react-native-web'));
vi.mock('react-native-safe-area-context', async () => ({ SafeAreaView: (await import('react-native-web')).View }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('expo-crypto', () => ({ randomUUID: () => '40000000-0000-4000-8000-000000000004' }));
vi.mock('@react-navigation/native', () => ({ useIsFocused: () => true, useNavigation: () => ({ navigate: vi.fn() }) }));
vi.mock('../../../services/api', () => ({ api: { get: boundary.get, post: boundary.post }, apiErrorMessage: () => 'Falha de conexão' }));
vi.mock('../../../services/notice', () => ({ Alert: { alert: boundary.alert } }));
vi.mock('../../../providers/SessionProvider', () => ({ useSession: () => ({ user: { id: 'reader', emailVerifiedAt: '2026-10-09' }, isSignedIn: true, getSessionScope: () => ({ userId: 'reader', epoch: 0 }) }) }));
vi.mock('../../premium/usePremiumStatus', () => ({ usePremiumStatus: () => ({ data: { serverNow: '2026-10-09T12:00:00Z', eligible: false, trialState: 'EXPIRED', trialStartedAt: '2026-09-01T12:00:00Z', trialEndsAt: '2026-10-01T12:00:00Z', promptMode: null, benefits: { seeReceivedLikes: false, unlimitedLikes: false, dailyLikeLimit: 15 } }, isLoading: false, isError: false, isTrialLocallyExpired: false, refetch: vi.fn() }) }));
vi.mock('../../premium/PremiumOfferProvider', () => ({ usePremiumOffer: () => ({ openOffer: vi.fn() }) }));

import { Discover } from '../../../pages/Discover';
import { Likes } from '../../../pages/Likes';

const book = { id: 'book', title: 'Livro que deve voltar', authors: ['Autora'], subjects: [], availability: 'AVAILABLE', owner: { id: 'owner', name: 'Ana' }, images: [] };
const sentLike = { id: 'like', book: { id: book.id, title: book.title }, owner: book.owner, likedAt: '2026-10-09T12:00:00Z' };
const pageInfo = { hasNextPage: false, nextCursor: null };
const clients: QueryClient[] = [];
let liked: boolean;

beforeEach(() => {
  liked = true;
  boundary.get.mockReset(); boundary.post.mockReset(); boundary.alert.mockReset();
  boundary.get.mockImplementation(async (url: string) => {
    if (url === '/api/v1/discover') return { data: { data: { items: liked ? [] : [book], pageInfo } } };
    if (url === '/api/v1/likes/sent') return { data: { data: { items: liked ? [sentLike] : [], hasMore: false, nextCursor: null } } };
    if (url === '/api/v1/likes/received/count') return { data: { data: { count: 0 } } };
    throw new Error(`Unexpected request: ${url}`);
  });
  boundary.post.mockImplementation(async (url: string, input: { targetBookId: string; action: string }) => {
    expect(url).toBe('/api/v1/interactions');
    expect(input.targetBookId).toBe(book.id);
    expect(['LIKE', 'PASS']).toContain(input.action);
    liked = input.action === 'LIKE';
    return { data: { data: { interaction: { id: 'like' }, match: null } } };
  });
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); });

function host() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><Discover /><Likes navigation={{ navigate: vi.fn() } as any} route={{} as any} /></QueryClientProvider>);
  return client;
}

async function openSentLikes() {
  fireEvent.click(screen.getByText('Minhas curtidas'));
  await screen.findByRole('button', { name: 'Remover curtida enviada para Ana' });
}

describe('remoção de curtida e fila Descobrir', () => {
  it('remove somente o livro enviado mesmo quando a fila muda durante uma curtida pendente', async () => {
    const second = { ...book, id: 'second', title: 'Livro B em análise' };
    const third = { ...book, id: 'third', title: 'Livro C disponível' };
    const candidates = [book, second, third];
    const likedIds = new Set([book.id]);
    let finishLike!: () => void;
    boundary.get.mockImplementation(async (url: string) => {
      if (url === '/api/v1/discover') return { data: { data: { items: candidates.filter(item => !likedIds.has(item.id)), pageInfo } } };
      if (url === '/api/v1/likes/sent') return { data: { data: { items: candidates.filter(item => likedIds.has(item.id)).map(item => ({ ...sentLike, id: item.id, book: { id: item.id, title: item.title } })), hasMore: false, nextCursor: null } } };
      if (url === '/api/v1/likes/received/count') return { data: { data: { count: 0 } } };
      throw new Error(`Unexpected request: ${url}`);
    });
    boundary.post.mockImplementation((url: string, input: { targetBookId: string; action: string }) => {
      expect(url).toBe('/api/v1/interactions');
      if (input.action === 'LIKE') {
        expect(input.targetBookId).toBe(second.id);
        return new Promise(resolve => { finishLike = () => { likedIds.add(second.id); resolve({ data: { data: { interaction: { id: 'second-like' }, match: null } } }); }; });
      }
      expect(input.action).toBe('PASS'); expect(input.targetBookId).toBe(book.id);
      likedIds.delete(book.id);
      return Promise.resolve({ data: { data: { interaction: { id: 'like' }, match: null } } });
    });
    const client = host();
    await screen.findByRole('button', { name: 'Ver Livro B em análise, de Autora. Livro de Ana' });
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' }));
    await waitFor(() => expect(finishLike).toBeTypeOf('function'));
    await openSentLikes();
    fireEvent.click(screen.getByRole('button', { name: 'Remover curtida enviada para Ana' }));
    const buttons = boundary.alert.mock.calls.at(-1)?.[2];
    await act(async () => buttons.find((button: { text: string }) => button.text === 'Remover').onPress());
    await waitFor(() => {
      const cached = client.getQueryData<{ pages: { items: { id: string }[] }[] }>(['books', 'discover']);
      expect(cached?.pages.flatMap(page => page.items.map(item => item.id))).toEqual([book.id, second.id, third.id]);
    });
    expect(screen.getByRole('button', { name: 'Ver Livro B em análise, de Autora. Livro de Ana' })).toBeTruthy();

    await act(async () => finishLike());
    await waitFor(() => {
      const cached = client.getQueryData<{ pages: { items: { id: string }[] }[] }>(['books', 'discover']);
      expect(cached?.pages.flatMap(page => page.items.map(item => item.id))).toEqual([book.id, third.id]);
    });
    expect(screen.getByRole('button', { name: 'Ver Livro que deve voltar, de Autora. Livro de Ana' })).toBeTruthy();
  });

  it('retorna o livro ao Descobrir depois da confirmação, sem recarregar a página', async () => {
    host();
    await screen.findByText('Você chegou ao fim por agora');
    await openSentLikes();
    fireEvent.click(screen.getByRole('button', { name: 'Remover curtida enviada para Ana' }));
    const buttons = boundary.alert.mock.calls.at(-1)?.[2];
    await act(async () => buttons.find((button: { text: string }) => button.text === 'Remover').onPress());

    await screen.findByRole('button', { name: 'Ver Livro que deve voltar, de Autora. Livro de Ana' });
    expect(await screen.findByText('Você não curtiu ninguém')).toBeTruthy();
    expect(screen.queryByText('Você chegou ao fim por agora')).toBeNull();
  });

  it('preserva a curtida e a fila quando a remoção falha', async () => {
    const client = host();
    await screen.findByText('Você chegou ao fim por agora');
    await openSentLikes();
    boundary.post.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Remover curtida enviada para Ana' }));
    const buttons = boundary.alert.mock.calls.at(-1)?.[2];
    await act(async () => buttons.find((button: { text: string }) => button.text === 'Remover').onPress());

    await waitFor(() => expect(client.getMutationCache().getAll().at(-1)?.state.status).toBe('error'));
    expect(screen.getByRole('button', { name: 'Remover curtida enviada para Ana' })).toBeTruthy();
    expect(screen.getByText('Você chegou ao fim por agora')).toBeTruthy();
    expect(client.getQueryState(['books', 'discover'])?.isInvalidated).toBe(false);
  });

  it('recarrega uma fila vazia em cache ao voltar para a aba Descobrir', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    clients.push(client);
    client.setQueryData(['books', 'discover'], { pages: [{ items: [], pageInfo }], pageParams: [''] });
    const tree = render(<QueryClientProvider client={client}><Likes navigation={{ navigate: vi.fn() } as any} route={{} as any} /></QueryClientProvider>);
    await openSentLikes();
    fireEvent.click(screen.getByRole('button', { name: 'Remover curtida enviada para Ana' }));
    const buttons = boundary.alert.mock.calls.at(-1)?.[2];
    await act(async () => buttons.find((button: { text: string }) => button.text === 'Remover').onPress());
    await screen.findByText('Você não curtiu ninguém');

    tree.rerender(<QueryClientProvider client={client}><Discover /></QueryClientProvider>);
    expect(await screen.findByRole('button', { name: 'Ver Livro que deve voltar, de Autora. Livro de Ana' })).toBeTruthy();
  });

  it('atualiza Minhas curtidas ao curtir novamente no Descobrir', async () => {
    liked = false;
    host();
    fireEvent.click(screen.getByText('Minhas curtidas'));
    await screen.findByText('Você não curtiu ninguém');
    await screen.findByRole('button', { name: 'Gostei do livro' });
    fireEvent.click(screen.getByRole('button', { name: 'Gostei do livro' }));

    await screen.findByRole('button', { name: 'Remover curtida enviada para Ana' });
    expect(screen.queryByText('Você não curtiu ninguém')).toBeNull();
    expect(await screen.findByText('Você chegou ao fim por agora')).toBeTruthy();
  });
});
