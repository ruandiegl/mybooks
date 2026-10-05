import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => storage.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { storage.set(key, value); },
  deleteItemAsync: async (key: string) => { storage.delete(key); }
}));

import { authApi } from '../authApi';
import { loadTokens, saveTokens } from '../authStorage';
import { sessionTransport } from '../authTransport';
import type { AuthSessionResponse } from '../../../types/api';

const user = { id: 'reader-1', name: 'Leitora', interests: [], isActive: true };
const previousTokens = { accessToken: 'previous-access', refreshToken: 'previous-refresh', expiresAt: Date.parse('2030-01-01T00:00:00Z') };

beforeEach(() => {
  vi.restoreAllMocks();
  storage.clear();
});

describe('native session transport after the PWA merge', () => {
  it('coalesces HTTP and socket refreshes into one token rotation', async () => {
    let finishRefresh!: (response: AuthSessionResponse) => void;
    const pending = new Promise<AuthSessionResponse>((resolve) => { finishRefresh = resolve; });
    const refresh = vi.spyOn(authApi, 'refresh').mockReturnValue(pending);

    const http = sessionTransport.refresh(previousTokens);
    const socket = sessionTransport.refresh(previousTokens);
    const requests = refresh.mock.calls.length;
    finishRefresh({ accessToken: 'rotated-access', refreshToken: 'rotated-refresh', expiresAt: '2030-01-01T01:00:00Z', user });
    const snapshots = await Promise.all([http, socket]);

    expect(requests).toBe(1);
    expect(snapshots).toEqual([
      expect.objectContaining({ accessToken: 'rotated-access', refreshToken: 'rotated-refresh' }),
      expect.objectContaining({ accessToken: 'rotated-access', refreshToken: 'rotated-refresh' })
    ]);
    expect(await loadTokens()).toMatchObject({ accessToken: 'rotated-access', refreshToken: 'rotated-refresh' });
  });

  it.each([null, ''])('rejects an invalid native refresh token (%s) without replacing the stored session', async (refreshToken) => {
    await saveTokens(previousTokens);
    const response: AuthSessionResponse = {
      accessToken: 'new-access', refreshToken, expiresAt: '2030-01-01T01:00:00Z', user
    };

    await expect(sessionTransport.accept(response)).rejects.toThrow('sessão nativa inválida');
    expect(await loadTokens()).toEqual(previousTokens);
  });

  it('propagates a failed revocation so the provider cannot clear the native session prematurely', async () => {
    await saveTokens(previousTokens);
    const failure = new Error('revocation unavailable');
    vi.spyOn(authApi, 'logout').mockRejectedValueOnce(failure);

    await expect(sessionTransport.signOut(previousTokens)).rejects.toBe(failure);
    expect(await loadTokens()).toEqual(previousTokens);
  });

  it('stores and restores a valid native token pair', async () => {
    const accepted = await sessionTransport.accept({
      accessToken: 'native-access', refreshToken: 'native-refresh', expiresAt: '2030-01-01T00:00:00Z', user
    });

    expect(accepted.user).toEqual(user);
    expect(await sessionTransport.restore()).toEqual({
      accessToken: 'native-access', refreshToken: 'native-refresh', expiresAt: Date.parse('2030-01-01T00:00:00Z')
    });
  });
});
