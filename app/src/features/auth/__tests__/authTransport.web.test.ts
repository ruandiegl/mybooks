import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../authApi', () => ({
  authApi: {
    refresh: vi.fn(),
    logout: vi.fn()
  }
}));

const { authApi } = await import('../authApi');

const session = {
  accessToken: 'short-lived-access-token',
  expiresAt: '2026-10-01T12:00:00.000Z',
  user: { id: 'user-1', name: 'Leitora', interests: [], isActive: true }
};

function makeSessionStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    values
  };
}

function makeLockManager() {
  let tail = Promise.resolve();
  return {
    request: async <T>(_name: string, callback: () => Promise<T>): Promise<T> => {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try { return await callback(); }
      finally { release(); }
    }
  };
}

async function loadFreshTransport() {
  vi.resetModules();
  return await import('../authTransport.web');
}

describe('browser session transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage(), localStorage: makeSessionStorage() });
    vi.stubGlobal('navigator', { locks: makeLockManager() });
  });

  it('restores through the HttpOnly cookie after a page reload without persisting tokens in browser storage', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(session);
    const { sessionTransport: transport } = await loadFreshTransport();

    await expect(transport.restore()).resolves.toMatchObject({
      accessToken: session.accessToken,
      user: session.user
    });
    expect(authApi.refresh).toHaveBeenCalledOnce();
    expect(window.sessionStorage.values.size).toBe(0);
  });

  it('preserves the web session and propagates failed revocation for retry', async () => {
    vi.mocked(authApi.logout).mockRejectedValue(new Error('offline'));
    vi.mocked(authApi.refresh).mockResolvedValue(session);
    const { sessionTransport: transport } = await loadFreshTransport();
    await transport.accept(session);

    await expect(transport.signOut(null)).rejects.toThrow('offline');
    await expect(transport.getToken(null)).resolves.toBe(session.accessToken);
    await expect(transport.restore()).resolves.toMatchObject({ accessToken: session.accessToken });
    expect(authApi.logout).toHaveBeenCalledOnce();
    expect(authApi.refresh).not.toHaveBeenCalled();
    expect([...window.localStorage.values.values()].join(' ')).not.toContain('refresh');
    const reopenedTab = await loadFreshTransport();
    await expect(reopenedTab.sessionTransport.restore()).resolves.toMatchObject({ accessToken: session.accessToken });
    await expect(reopenedTab.sessionTransport.getToken(null)).resolves.toBe(session.accessToken);
  });

  it('serializes browser cookie refreshes across tabs', async () => {
    vi.mocked(authApi.refresh).mockReset();
    let releaseFirst!: () => void;
    let markFirstStarted!: () => void;
    const firstRefreshGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const firstRefreshStarted = new Promise<void>((resolve) => { markFirstStarted = resolve; });
    vi.mocked(authApi.refresh)
      .mockImplementationOnce(async () => {
        markFirstStarted();
        await firstRefreshGate;
        return session;
      })
      .mockResolvedValueOnce({ ...session, accessToken: 'second-tab-access' });
    const module = await loadFreshTransport();
    const locks = makeLockManager();
    const firstTab = module.createWebSessionTransport({ auth: authApi, locks, storage: () => window.localStorage });
    const secondTab = module.createWebSessionTransport({ auth: authApi, locks, storage: () => window.localStorage });

    const first = firstTab.refresh(null);
    await firstRefreshStarted;
    const second = secondTab.refresh(null);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(authApi.refresh).toHaveBeenCalledOnce();
    releaseFirst();
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(authApi.refresh).toHaveBeenCalledTimes(2);
  });

  it('does not rotate the shared refresh cookie when browser locks are unavailable', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(session);
    const module = await loadFreshTransport();
    const transport = module.createWebSessionTransport({ auth: authApi, locks: null, storage: () => window.localStorage });

    await expect(transport.refresh(null)).resolves.toBeNull();
    expect(authApi.refresh).not.toHaveBeenCalled();
  });

  it('keeps the refreshed session when a queued logout cannot revoke it', async () => {
    let releaseFirst!: () => void;
    let markFirstStarted!: () => void;
    const firstRefreshGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const firstRefreshStarted = new Promise<void>((resolve) => { markFirstStarted = resolve; });
    const events: string[] = [];
    vi.mocked(authApi.refresh).mockImplementation(async () => {
      events.push('refresh-start');
      markFirstStarted();
      await firstRefreshGate;
      events.push('refresh-end');
      return session;
    });
    vi.mocked(authApi.logout).mockImplementation(async () => {
      events.push('logout');
      throw new Error('offline');
    });
    const module = await loadFreshTransport();
    const transport = module.createWebSessionTransport({ auth: authApi, locks: makeLockManager(), storage: () => window.localStorage });

    const refresh = transport.refresh(null);
    await firstRefreshStarted;
    const logout = expect(transport.signOut(null)).rejects.toThrow('offline');
    releaseFirst();
    const [refreshResult] = await Promise.all([refresh, logout]);

    expect(refreshResult).toMatchObject({ accessToken: session.accessToken });
    expect(events).toEqual(['refresh-start', 'refresh-end', 'logout']);
    expect([...window.localStorage.values.values()]).not.toContain('1');
    await expect(transport.getToken(null)).resolves.toBe(session.accessToken);
  });

  it('marks logout across tabs only after successful revocation', async () => {
    vi.mocked(authApi.logout).mockResolvedValue({ ok: true });
    const { sessionTransport: transport } = await loadFreshTransport();
    await transport.accept(session);

    await transport.signOut(null);

    await expect(transport.getToken(null)).resolves.toBeNull();
    await expect(transport.restore()).resolves.toBeNull();
    expect([...window.localStorage.values.values()]).toContain('1');
  });

  it('keeps the access token only in memory after accepting a login response', async () => {
    const { sessionTransport: transport } = await loadFreshTransport();

    await expect(transport.accept(session)).resolves.toMatchObject({ accessToken: session.accessToken });
    expect(window.sessionStorage.values.size).toBe(0);
  });

  it('keeps the in-memory session when refresh fails temporarily', async () => {
    const { sessionTransport: transport } = await loadFreshTransport();
    await transport.accept(session);
    vi.mocked(authApi.refresh).mockRejectedValue(Object.assign(new Error('service unavailable'), { response: { status: 503 } }));

    await expect(transport.refresh(null)).rejects.toMatchObject({ response: { status: 503 } });
    await expect(transport.getToken(null)).resolves.toBe(session.accessToken);
    await expect(transport.restore()).resolves.toMatchObject({ accessToken: session.accessToken });
  });
});
