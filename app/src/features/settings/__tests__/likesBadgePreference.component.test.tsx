// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
const io = vi.hoisted(() => ({ userId: 'ana', epoch: 1, get: vi.fn() }));
vi.mock('../../../services/api', () => ({ api: { get: io.get }, apiErrorMessage: () => 'error' }));
vi.mock('../../../providers/SessionProvider', () => ({ useSession: () => ({ user: { id: io.userId }, captureActor: () => ({ userId: io.userId, epoch: io.epoch, sessionId: '10000000-0000-4000-8000-000000000001' }), isActorCurrent: (actor: any) => actor.userId === io.userId && actor.epoch === io.epoch }) }));
import { useAccountPreferences } from '../useAccountPreferences';
it('removes only badge visibility and never uses another user preference on account change', async () => {
  let resolve!: (value: unknown) => void;
  io.get.mockImplementation(() => io.userId === 'ana' ? Promise.resolve({ data: { data: { schemaVersion: 1, userId: 'ana', notifications: { showLikesBadge: false }, capabilities: { push: false } } } }) : new Promise(r => { resolve = r; }));
  const client = new QueryClient(); client.setQueryData(['likes', 'received', 'count'], { count: 12 });
  const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const mounted = renderHook(useAccountPreferences, { wrapper });
  await waitFor(() => expect(mounted.result.current.showLikesBadge).toBe(false));
  expect(client.getQueryData(['likes', 'received', 'count'])).toEqual({ count: 12 });
  io.userId = 'bia'; mounted.rerender();
  expect(mounted.result.current.showLikesBadge).toBe(true);
  await act(async () => { resolve({ data: { data: { schemaVersion: 1, userId: 'ana', notifications: { showLikesBadge: false } } } }); });
  await waitFor(() => expect(mounted.result.current.isError).toBe(true));
  expect(mounted.result.current.showLikesBadge).toBe(true);
  mounted.unmount(); client.clear();
});
