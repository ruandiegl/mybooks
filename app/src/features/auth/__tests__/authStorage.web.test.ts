import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn()
}));

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('expo-secure-store', () => secureStore);

const { clearTokens, loadTokens, saveTokens } = await import('../authStorage');

describe('web auth token storage', () => {
  beforeEach(async () => {
    await clearTokens();
    vi.clearAllMocks();
  });

  it('keeps web tokens in memory without calling SecureStore', async () => {
    const tokens = { accessToken: 'access', refreshToken: null, expiresAt: 1_800_000_000_000 };

    await saveTokens(tokens);
    await expect(loadTokens()).resolves.toEqual(tokens);
    await clearTokens();
    await expect(loadTokens()).resolves.toBeNull();
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
