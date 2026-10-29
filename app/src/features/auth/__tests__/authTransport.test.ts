import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authApi, clearTokens, loadTokens, saveTokens } = vi.hoisted(() => ({
  authApi: { refresh: vi.fn() },
  clearTokens: vi.fn(),
  loadTokens: vi.fn(),
  saveTokens: vi.fn()
}));

vi.mock('../authApi', () => ({ authApi }));
vi.mock('../authStorage', () => ({ clearTokens, loadTokens, saveTokens }));

const { sessionTransport } = await import('../authTransport');

const current = { accessToken: 'expired', refreshToken: 'refresh-token', expiresAt: 1 };

describe('native session transport refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propagates transient refresh failures so the session can recover later', async () => {
    const transientError = { response: { status: 503 } };
    authApi.refresh.mockRejectedValue(transientError);

    await expect(sessionTransport.refresh(current)).rejects.toBe(transientError);
    expect(saveTokens).not.toHaveBeenCalled();
  });

  it('returns null when the refresh token is rejected with 401', async () => {
    authApi.refresh.mockRejectedValue({ response: { status: 401 } });

    await expect(sessionTransport.refresh(current)).resolves.toBeNull();
  });
});
