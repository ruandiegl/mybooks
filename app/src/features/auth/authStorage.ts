import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '../../types/api';

const SESSION_KEY = 'trocalivros.auth.session.v1';
let webTokens: AuthTokens | null = null;

function isAuthTokens(value: unknown): value is AuthTokens {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AuthTokens>;
  return typeof candidate.accessToken === 'string'
    && candidate.accessToken.length > 0
    && (candidate.refreshToken === null
      || (typeof candidate.refreshToken === 'string' && candidate.refreshToken.length > 0))
    && typeof candidate.expiresAt === 'number'
    && Number.isFinite(candidate.expiresAt);
}

export async function loadTokens(): Promise<AuthTokens | null> {
  if (Platform.OS === 'web') return webTokens;

  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;

  try {
    const parsed: unknown = JSON.parse(stored);
    if (isAuthTokens(parsed)) return parsed;
  } catch {
    // Sessões antigas ou corrompidas são descartadas abaixo.
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
  return null;
}

export function saveTokens(tokens: AuthTokens) {
  if (Platform.OS === 'web') {
    webTokens = tokens;
    return Promise.resolve();
  }

  return SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
  if (Platform.OS === 'web') {
    webTokens = null;
    return Promise.resolve();
  }

  return SecureStore.deleteItemAsync(SESSION_KEY);
}
