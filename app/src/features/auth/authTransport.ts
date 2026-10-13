import { authApi } from './authApi';
import { clearTokens, loadTokens, saveTokens } from './authStorage';
import type { AuthSessionResponse, BrowserAuthSessionResponse, ChangePasswordInput, User } from '../../types/api';
import type { SessionActor } from './sessionActor';

export type SessionResponse = AuthSessionResponse | BrowserAuthSessionResponse;

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

let generation = 0;
let storageTail: Promise<unknown> = Promise.resolve();
let refreshRun: { generation: number; token: string; promise: Promise<SessionSnapshot | null> } | null = null;
function storeCurrent<T>(ticket: number, operation: () => Promise<T>): Promise<T | null> {
  const work = storageTail.catch(() => {}).then(async () => {
    if (ticket !== generation) return null;
    const value = await operation();
    return ticket === generation ? value : null;
  });
  storageTail = work.catch(() => {});
  return work;
}

export const sessionTransport: SessionTransport = {
  async restore() {
    const tokens = await storeCurrent(generation, loadTokens);
    return tokens ? { ...tokens } : null;
  },
  async accept(response) {
    if (!('refreshToken' in response) || typeof response.refreshToken !== 'string' || !response.refreshToken) {
      throw new Error('Resposta de sessão nativa inválida.');
    }
    const next = snapshot(response);
    const ticket = ++generation;
    await storeCurrent(ticket, async () => { await saveTokens({ accessToken: next.accessToken, refreshToken: next.refreshToken!, expiresAt: next.expiresAt }); return true; });
    return next;
  },
  async getToken(current) {
    return current?.accessToken ?? null;
  },
  async refresh(current) {
    if (!current?.refreshToken) return null;
    const ticket = generation, token = current.refreshToken;
    if (refreshRun?.generation === ticket && refreshRun.token === token) return refreshRun.promise;
    const promise = (async () => {
      try {
        const response = await authApi.refresh(token);
        if (ticket !== generation) return null;
        const next = snapshot(response);
        const saved = await storeCurrent(ticket, async () => { await saveTokens({ accessToken: next.accessToken, refreshToken: next.refreshToken!, expiresAt: next.expiresAt }); return true; });
        return saved ? next : null;
      } catch (error) {
        if (ticket !== generation) return null;
        if ((error as { response?: { status?: number } })?.response?.status === 401) return null;
        throw error;
      }
    })();
    const run = { generation: ticket, token, promise }; refreshRun = run;
    try {
      return await promise;
    } finally {
      if (refreshRun === run) refreshRun = null;
    }
  },
  async clear() { const ticket = ++generation; await storeCurrent(ticket, async () => { await clearTokens(); return true; }); },
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
