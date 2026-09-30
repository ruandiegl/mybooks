import { describe, expect, it, vi } from 'vitest';
import { canUseWebAuthTransport, shouldUseCookieSession, withCookieRefreshLock } from '../sessionTransport';

describe('secure web session transport', () => {
  it('uses cookies only when both the PWA and API use HTTPS', () => {
    expect(shouldUseCookieSession({ platform: 'web', pageProtocol: 'https:', pageOrigin: 'https://app.example.test', pageHostname: 'app.example.test', apiBaseUrl: 'https://app.example.test/api' })).toBe(true);
    expect(shouldUseCookieSession({ platform: 'web', pageProtocol: 'https:', pageOrigin: 'https://app.example.test', pageHostname: 'app.example.test', apiBaseUrl: 'https://api.example.test' })).toBe(false);
    expect(shouldUseCookieSession({ platform: 'web', pageProtocol: 'http:', pageOrigin: 'http://localhost:8081', pageHostname: 'localhost', apiBaseUrl: 'https://localhost:8081/api' })).toBe(false);
    expect(shouldUseCookieSession({ platform: 'android', pageProtocol: null, pageOrigin: null, pageHostname: null, apiBaseUrl: 'https://app.example.test' })).toBe(false);
  });

  it('allows ephemeral HTTP auth only when both page and API resolve to loopback', () => {
    expect(canUseWebAuthTransport({ platform: 'web', pageProtocol: 'http:', pageHostname: 'localhost', pageOrigin: 'http://localhost:8081', apiBaseUrl: 'http://127.0.0.1:3000/api' })).toBe(true);
    expect(canUseWebAuthTransport({ platform: 'web', pageProtocol: 'http:', pageHostname: '192.168.1.20', pageOrigin: 'http://192.168.1.20:8081', apiBaseUrl: 'http://192.168.1.20:3000/api' })).toBe(false);
    expect(canUseWebAuthTransport({ platform: 'web', pageProtocol: 'https:', pageHostname: 'app.example.test', pageOrigin: 'https://app.example.test', apiBaseUrl: 'https://api.example.test' })).toBe(false);
    expect(canUseWebAuthTransport({ platform: 'android', pageProtocol: null, pageHostname: null, pageOrigin: null, apiBaseUrl: 'http://192.168.1.20:3000/api' })).toBe(true);
  });

  it('serializes cookie refresh through the browser origin lock', async () => {
    const task = vi.fn(async () => 'refreshed');
    const manager = { request: vi.fn(async (_name, _options, callback) => callback()) };

    await expect(withCookieRefreshLock(true, task, manager)).resolves.toBe('refreshed');
    expect(manager.request).toHaveBeenCalledWith('trocalivros-auth-refresh', { mode: 'exclusive' }, task);
  });

  it('does not refresh a cookie session when cross-tab locking is unavailable', async () => {
    const task = vi.fn(async () => 'refreshed');

    await expect(withCookieRefreshLock(true, task, null)).rejects.toThrow(/atualize/i);
    expect(task).not.toHaveBeenCalled();
  });
});
