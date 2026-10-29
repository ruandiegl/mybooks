// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('react-native', async () => {
  const native = await import('react-native-web');
  const React = await import('react');
  return {
    ...native,
    FlatList: ({ data, renderItem, ListHeaderComponent, ListEmptyComponent }: any) => React.createElement(
      'div', null, ListHeaderComponent,
      ...(data.length ? data.map((item: unknown, index: number) => renderItem({ item, index })) : [ListEmptyComponent])
    )
  };
});
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
vi.mock('../../../services/api', () => ({ api: { get: boundary.get } }));
vi.mock('../../../providers/ThemeProvider', () => ({ useAppTheme: () => ({ theme: { colors: { primary: 'red' } } }) }));
vi.mock('../../../styles/useThemedStyles', () => ({ useThemedStyles: () => ({}) }));
vi.mock('../../../features/media/useMediaBinding', () => ({ useMediaBinding: () => ({}) }));
vi.mock('../../../components/AppScreen', () => ({ AppScreen: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../../components/Card', () => ({ Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../../components/StateView', () => ({ StateView: ({ title, description }: { title: string; description?: string }) => <div>{title} {description}</div> }));
vi.mock('../../../components/Avatar', () => ({ Avatar: ({ name }: { name: string }) => <span>{name}</span> }));

import { StreakLeaderboard } from '../../../pages/StreakLeaderboard';

const globalRanking = {
  currentUser: { currentStreak: 4, rank: 7 },
  entries: [{ name: 'Global Reader', avatarUrl: null, avatarUrlExpiresAt: null, avatarVersion: 0, currentStreak: 8, rank: 1 }]
};
const matchRanking = {
  currentUser: { currentStreak: 4, rank: 2 },
  entries: [{ name: 'Matched Reader', avatarUrl: null, avatarUrlExpiresAt: null, avatarVersion: 0, currentStreak: 5, rank: 1 }]
};

let client: QueryClient;

beforeEach(() => {
  boundary.get.mockReset().mockImplementation(async (_url, options) => ({ data: { data: options?.params?.scope === 'matches' ? matchRanking : globalRanking } }));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});
afterEach(() => { cleanup(); client.clear(); });

function mount() {
  return render(<QueryClientProvider client={client}><StreakLeaderboard /></QueryClientProvider>);
}

describe('leaderboard scope selector', () => {
  it('starts with the global ranking and switches to active matches without mixing positions', async () => {
    mount();
    expect(await screen.findByLabelText(/Posição 1º, Global Reader/)).toBeTruthy();
    expect(screen.getByText('7º lugar')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: 'Matches ativos' }));
    expect(screen.getByRole('radio', { name: 'Matches ativos' }).getAttribute('aria-checked')).toBe('true');
    expect(await screen.findByLabelText(/Posição 1º, Matched Reader/)).toBeTruthy();
    expect(screen.getByText('2º lugar')).toBeTruthy();
    expect(screen.queryByLabelText(/Global Reader/)).toBeNull();
    expect(boundary.get).toHaveBeenCalledWith('/api/v1/gamification/leaderboard', { params: { scope: 'matches' } });

    fireEvent.click(screen.getByRole('radio', { name: 'Global' }));
    expect(await screen.findByLabelText(/Posição 1º, Global Reader/)).toBeTruthy();
    expect(screen.getByText('7º lugar')).toBeTruthy();
    expect(screen.queryByLabelText(/Matched Reader/)).toBeNull();
  });

  it('shows a match-specific empty state while preserving the personal streak', async () => {
    boundary.get.mockImplementation(async (_url, options) => ({ data: { data: options?.params?.scope === 'matches'
      ? { currentUser: { currentStreak: 4, rank: null }, entries: [] }
      : globalRanking } }));
    mount();
    await screen.findByLabelText(/Posição 1º, Global Reader/);
    fireEvent.click(screen.getByRole('radio', { name: 'Matches ativos' }));
    expect(await screen.findByText(/Nenhuma sequência entre seus matches/)).toBeTruthy();
    expect(screen.getByText('4 dias seguidos')).toBeTruthy();
    expect(screen.getByText('Sem posição ainda')).toBeTruthy();
  });

  it('keeps the selector usable after a match-ranking request fails', async () => {
    boundary.get.mockImplementation(async (_url, options) => {
      if (options?.params?.scope === 'matches') throw new Error('offline');
      return { data: { data: globalRanking } };
    });
    mount();
    await screen.findByLabelText(/Posição 1º, Global Reader/);
    fireEvent.click(screen.getByRole('radio', { name: 'Matches ativos' }));
    expect(await screen.findByText(/Não foi possível abrir o ranking/)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Global' }));
    await waitFor(() => expect(screen.getByLabelText(/Posição 1º, Global Reader/)).toBeTruthy());
  });
});
