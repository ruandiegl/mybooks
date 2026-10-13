// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const io = vi.hoisted(() => ({ revoke: vi.fn(), clear: vi.fn(), refresh: vi.fn() }));
vi.mock('react-native', async () => await import('react-native-web'));
vi.mock('../../auth/authApi', () => ({ authApi: { me: async () => null } }));
vi.mock('../../auth/authTransport', () => ({ sessionTransport: { restore: async () => null, accept: async (response: any) => ({ ...response, expiresAt: Date.parse(response.expiresAt) }), getToken: async (value: any) => value?.accessToken ?? null, clear: io.clear, signOut: io.revoke, refresh: io.refresh } }));
vi.mock('../../../services/api', () => ({ configureApiSession: () => {} }));
import { SessionProvider, useSession } from '../../../providers/SessionProvider';
const sid = '10000000-0000-4000-8000-000000000001';
const response = (id: string) => ({ accessToken: `e30.${btoa(JSON.stringify({ sub: id, sid }))}.test`, refreshToken: 'refresh-' + id, expiresAt: '2030-01-01T00:00:00Z', user: { id, name: id, interests: [], isActive: true, avatarVersion: 0, avatarUrl: null } });
function host() {
  const client = new QueryClient();
  const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}><SessionProvider>{children}</SessionProvider></QueryClientProvider>;
  return { ...renderHook(useSession, { wrapper }), client };
}
beforeEach(() => { vi.clearAllMocks(); io.clear.mockResolvedValue(undefined); });
afterEach(cleanup);
describe('terminal account operation ownership', () => {
  it.each(['other', 'ana'])('never clears a later login (%s) after an old logout returns', async id => {
    let finish!: () => void; io.revoke.mockReturnValue(new Promise<void>(r => { finish = r; }));
    const hook = host(); await waitFor(() => expect(hook.result.current.isLoaded).toBe(true));
    await act(async () => { await hook.result.current.establishSession(response('ana')); });
    const old = hook.result.current.captureActor()!;
    const pending = hook.result.current.signOut(old);
    await act(async () => { await hook.result.current.establishSession(response(id)); });
    hook.client.setQueryData(['private-new'], 'new account data');
    await act(async () => { finish(); await pending; });
    expect(hook.result.current.user?.id).toBe(id);
    expect(hook.client.getQueryData(['private-new'])).toBe('new account data');
    expect(io.clear).not.toHaveBeenCalled(); hook.client.clear();
  });
  it('hides private data after confirmed revocation even when deleting local storage fails', async () => {
    io.revoke.mockResolvedValue(undefined); io.clear.mockRejectedValue(Error('secure store unavailable'));
    const hook = host(); await waitFor(() => expect(hook.result.current.isLoaded).toBe(true));
    await act(async () => { await hook.result.current.establishSession(response('ana')); });
    hook.client.setQueryData(['private'], 'secret');
    await act(async () => { await hook.result.current.signOut(hook.result.current.captureActor()!).catch(() => {}); });
    expect(hook.result.current.isSignedIn).toBe(false); expect(hook.client.getQueryData(['private'])).toBeUndefined();
    expect(hook.result.current.sessionNotice).toMatch(/sessão.*encerrada/i); hook.client.clear();
  });
  it('ignores a refresh response issued for a previous epoch', async () => {
    let finish!: (value: any) => void; io.refresh.mockReturnValue(new Promise(r => { finish = r; }));
    const hook = host(); await waitFor(() => expect(hook.result.current.isLoaded).toBe(true));
    await act(async () => { await hook.result.current.establishSession(response('ana')); });
    const oldRefresh = hook.result.current.refreshSession();
    await act(async () => { await hook.result.current.establishSession(response('other')); });
    await act(async () => { finish({ ...response('ana'), expiresAt: Date.parse(response('ana').expiresAt) }); await oldRefresh; });
    expect(hook.result.current.user?.id).toBe('other'); hook.client.clear();
  });
});
