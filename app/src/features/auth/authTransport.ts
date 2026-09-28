import { authApi } from './authApi';
import { clearTokens, loadTokens, saveTokens } from './authStorage';
import type { AuthSessionResponse, AuthTokens, BrowserAuthSessionResponse, User } from '../../types/api';

export type SessionResponse = AuthSessionResponse | BrowserAuthSessionResponse;

export type SessionSnapshot = {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
  user?: User;
};

export type SessionTransport = {
  restore: () => Promise<SessionSnapshot | null>;
  accept: (response: SessionResponse) => Promise<SessionSnapshot>;
  getToken: (current: SessionSnapshot | null) => Promise<string | null>;
  refresh: (current: SessionSnapshot | null) => Promise<SessionSnapshot | null>;
  clear: () => Promise<void>;
  signOut: (current: SessionSnapshot | null) => Promise<void>;
};

function snapshot(response: AuthSessionResponse): SessionSnapshot {
  const expiresAt = Date.parse(response.expiresAt);
  if (!Number.isFinite(expiresAt)) throw new Error('Expiração de sessão inválida.');
  return { accessToken: response.accessToken, refreshToken: response.refreshToken, expiresAt, user: response.user };
}

export const sessionTransport: SessionTransport = {
  async restore() {
    const tokens = await loadTokens();
    return tokens ? { ...tokens } : null;
  },
  async accept(response) {
    if (!('refreshToken' in response)) throw new Error('Resposta de sessão nativa inválida.');
    const next = snapshot(response);
    await saveTokens({ accessToken: next.accessToken, refreshToken: next.refreshToken!, expiresAt: next.expiresAt });
    return next;
  },
  async getToken(current) {
    return current?.accessToken ?? null;
  },
  async refresh(current) {
    if (!current?.refreshToken) return null;
    try {
      return await this.accept(await authApi.refresh(current.refreshToken));
    } catch {
      return null;
    }
  },
  clear: clearTokens,
  async signOut(current) {
    if (!current?.refreshToken) return;
    try { await authApi.logout(current.refreshToken); } catch { /* a sessão local é encerrada mesmo sem rede */ }
  }
};
