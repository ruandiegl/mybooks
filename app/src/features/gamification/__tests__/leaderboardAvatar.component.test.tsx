// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAMIFICATION_LEADERBOARD_QUERY_KEY } from '../api';

const boundary = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('react-native', async () => {
  const native = await import('react-native-web');
  const React = await import('react');
  return {
    ...native,
    FlatList: ({ data, renderItem, ListHeaderComponent }: any) => React.createElement(
      'div', null, ListHeaderComponent, ...data.map((item: unknown, index: number) => renderItem({ item, index }))
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
vi.mock('../../../components/StateView', () => ({ StateView: () => null }));
vi.mock('../../../components/Avatar', () => ({ Avatar: ({ url, onImageError }: { url: string | null; onImageError?: () => void }) => <button onClick={onImageError}>{url}</button> }));

import { StreakLeaderboard } from '../../../pages/StreakLeaderboard';

const initial = {
  currentUser: { currentStreak: 1, rank: 1 },
  entries: [{ name: 'Ana', avatarUrl: 'https://signed.test/first', avatarUrlExpiresAt: '2026-10-29T12:00:30.000Z', currentStreak: 1, rank: 1 }]
};
const renewed = {
  ...initial,
  entries: [{ ...initial.entries[0], avatarUrl: 'https://signed.test/second', avatarUrlExpiresAt: '2026-10-29T12:01:00.000Z' }]
};
let client: QueryClient;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-29T12:00:00.000Z'));
  boundary.get.mockReset();
  boundary.get.mockResolvedValue({ data: { data: renewed } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  client.setQueryData(GAMIFICATION_LEADERBOARD_QUERY_KEY, initial);
});
afterEach(() => { cleanup(); client.clear(); vi.useRealTimers(); });

describe('ranking avatar renewal', () => {
  it('refetches signed avatars before the earliest URL expires', async () => {
    render(<QueryClientProvider client={client}><StreakLeaderboard /></QueryClientProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(24_000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(boundary.get).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(GAMIFICATION_LEADERBOARD_QUERY_KEY)).toEqual(renewed);
  });

  it('refetches when an avatar image reports a failed signature', async () => {
    render(<QueryClientProvider client={client}><StreakLeaderboard /></QueryClientProvider>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'https://signed.test/first' })); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(boundary.get).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'https://signed.test/second' })).toBeTruthy();
  });
});
