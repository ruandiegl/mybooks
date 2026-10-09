import { beforeEach, expect, it, vi } from 'vitest';
const boundary = vi.hoisted(() => ({ refresh: vi.fn(), save: vi.fn(), clear: vi.fn(), stored: null as any }));
vi.mock('../authApi', () => ({ authApi: { refresh: boundary.refresh, logout: async () => {} } }));
vi.mock('../authStorage', () => ({ loadTokens: async () => boundary.stored, saveTokens: boundary.save, clearTokens: boundary.clear }));
const response = (id: string) => ({ accessToken: id, refreshToken: 'refresh-' + id, expiresAt: '2027-01-01T00:00:00Z', user: { id, name: id, interests: [], isActive: true } });
beforeEach(() => {
  vi.resetModules(); boundary.stored = null;
  boundary.refresh.mockReset(); boundary.clear.mockReset();
  boundary.save.mockReset().mockImplementation(async tokens => { boundary.stored = tokens; });
  boundary.clear.mockImplementation(async () => { boundary.stored = null; });
});
it('does not write old A refresh tokens after B was accepted', async () => {
  const { sessionTransport: transport } = await import('../authTransport');
  const a = await transport.accept(response('a'));
  let finish!: (value: unknown) => void;
  boundary.refresh.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const pending = transport.refresh(a);
  await transport.accept(response('b'));
  finish(response('a-new')); await pending;
  expect(boundary.stored.accessToken).toBe('b');
});
it('serializes secure-store writes so a slow A write never overwrites accepted B', async () => {
  const { sessionTransport: transport } = await import('../authTransport');
  const a = await transport.accept(response('a'));
  let started!: () => void, release!: () => void;
  const writing = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  boundary.save.mockImplementation(async tokens => { if (tokens.accessToken === 'a-new') { started(); await gate; } boundary.stored = tokens; });
  boundary.refresh.mockResolvedValue(response('a-new'));
  const pending = transport.refresh(a); await writing;
  const login = transport.accept(response('b'));
  release(); await Promise.all([pending, login]);
  expect(boundary.stored.accessToken).toBe('b');
});
