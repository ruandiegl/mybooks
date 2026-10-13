import { authApi } from './authApi';
import { clearTokens, loadTokens, saveTokens } from './authStorage';
import type { AuthSessionResponse, BrowserAuthSessionResponse, ChangePasswordInput, User } from '../../types/api';
import type { SessionActor } from './sessionActor';

export type SessionResponse = AuthSessionResponse | BrowserAuthSessionResponse;
export type SocketRecoveryReason = 'rotated' | 'expired' | 'unauthenticated';

export type SessionSnapshot = {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string | null;
  user?: User;
};

export type SessionTransport = {
  restore: () => Promise<SessionSnapshot | null>;
  accept: (response: SessionResponse) => Promise<SessionSnapshot>;
  getToken: (current: SessionSnapshot | null) => Promise<string | null>;
  refresh: (current: SessionSnapshot | null) => Promise<SessionSnapshot | null>;
  rebind: (current: SessionSnapshot | null, reason: SocketRecoveryReason) => Promise<SessionSnapshot | null>;
  clear: () => Promise<void>;
  signOut: (current: SessionSnapshot | null, actor?: SessionActor, isCurrent?: () => boolean) => Promise<void>;
  signOutAll: (current: SessionSnapshot, actor: SessionActor, isCurrent: () => boolean) => Promise<void>;
  changePassword: (current: SessionSnapshot, input: ChangePasswordInput, actor: SessionActor, isCurrent: () => boolean) => Promise<void>;
};

function snapshot(response: AuthSessionResponse): SessionSnapshot {
  const expiresAt = Date.parse(response.expiresAt);
  if (!Number.isFinite(expiresAt)) throw new Error('Expiração de sessão inválida.');
  return { accessToken: response.accessToken, refreshToken: response.refreshToken, expiresAt, user: response.user };
}

let refreshPromise: Promise<SessionSnapshot | null> | null = null;
let refreshOwner: string | undefined;
let generation = 0;

export const sessionTransport: SessionTransport = {
  async restore() {
    const tokens = await loadTokens();
    return tokens ? { ...tokens } : null;
  },
  async accept(response) {
    if (!('refreshToken' in response) || typeof response.refreshToken !== 'string' || !response.refreshToken) {
      throw new Error('Resposta de sessão nativa inválida.');
    }
    const next = snapshot(response);
    generation++;
    await saveTokens({ accessToken: next.accessToken, refreshToken: next.refreshToken!, expiresAt: next.expiresAt });
    return next;
  },
  async getToken(current) {
    return current?.accessToken ?? null;
  },
  async refresh(current) {
    if (!current?.refreshToken) return null;
    if (refreshPromise && refreshOwner === current.refreshToken) return refreshPromise;
    const ticket = generation;
    const ownPromise = (async () => {
      try {
        const response = await authApi.refresh(current.refreshToken!);
        if (ticket !== generation) return null;
        return await this.accept(response);
      } catch (error) {
        if ((error as { response?: { status?: number } })?.response?.status === 401) return null;
        throw error;
      }
    })();
    refreshPromise = ownPromise; refreshOwner = current.refreshToken;
    try {
      return await ownPromise;
    } finally {
      if (refreshPromise === ownPromise) { refreshPromise = null; refreshOwner = undefined; }
    }
  },
  async rebind(current, reason) {
    if (reason !== 'rotated') return this.refresh(current);
    if (refreshPromise && refreshOwner === current?.refreshToken) return refreshPromise;
    return current;
  },
  async clear() { generation++; await clearTokens(); },
  async signOut(current, actor, isCurrent) {
    if (isCurrent && !isCurrent()) throw Error('A sessão mudou.');
    if (!current?.refreshToken) return;
    await authApi.logout(current.refreshToken, actor);
  },
  async signOutAll(current, actor, isCurrent) {
    if (!isCurrent()) throw Error('A sessão mudou.');
    await authApi.logoutAll(current.accessToken, actor);
  },
  async changePassword(current, input, actor, isCurrent) {
    if (!isCurrent()) throw Error('A sessão mudou.');
    await authApi.changePassword(current.accessToken, input, actor);
  }
};
