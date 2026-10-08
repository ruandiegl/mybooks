// @vitest-environment jsdom
import React from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
const io = vi.hoisted(() => ({ clear: vi.fn(), initialToken: '', rotations: 0, user: { id: 'ana', name: 'Ana', interests: [], isActive: true, avatarUrl: null, avatarVersion: 0 }, token: `e30.${btoa(JSON.stringify({ sub: 'ana', sid: '10000000-0000-4000-8000-000000000001' }))}.test` }));
vi.mock('react-native', async () => await import('react-native-web'));
vi.mock('../../auth/authTransport', () => ({ sessionTransport: { restore: async () => ({ accessToken: io.initialToken, refreshToken: 'fixture-refresh', expiresAt: Date.parse('2030-01-01') }), getToken: async (current: any) => current?.accessToken ?? null, refresh: async () => { io.rotations++; return { accessToken: io.token, expiresAt: Date.parse('2030-01-01'), user: io.user }; }, clear: io.clear } }));
vi.mock('../../auth/authApi', async () => { const { api } = await import('../../../services/api'); return { authApi: { me: async () => (await api.get('/me')).data.data } }; });
import { api } from '../../../services/api';
import { SessionProvider, useSession } from '../../../providers/SessionProvider';
const original = api.defaults.adapter;
afterEach(() => { cleanup(); api.defaults.adapter = original; });
it.each(['valid-claims', 'malformed-access'])('keeps identity stable during bootstrap refresh (%s)', async initial => {
  io.initialToken = initial === 'valid-claims' ? io.token : initial; io.rotations = 0;
  let calls = 0, retries = 0; io.clear.mockResolvedValue(undefined); io.clear.mockClear();
  api.defaults.adapter = async config => {
    if ((config as { _authRetry?: boolean })._authRetry) retries++;
    if (++calls === 1) throw new AxiosError('expired', 'ERR_BAD_REQUEST', config, undefined, { status: 401, statusText: 'Unauthorized', data: {}, headers: {}, config });
    return { status: 200, statusText: 'OK', headers: {}, config, data: { data: io.user } };
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}><SessionProvider>{children}</SessionProvider></QueryClientProvider>;
  const hook = renderHook(useSession, { wrapper });
  await waitFor(() => expect(hook.result.current.isLoaded).toBe(true));
  expect(hook.result.current.isSignedIn).toBe(true); expect(hook.result.current.user?.id).toBe('ana');
  expect(retries).toBe(1); expect(io.rotations).toBe(1); expect(io.clear).not.toHaveBeenCalled(); client.clear();
});
