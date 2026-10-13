import axios, { AxiosError } from 'axios';
import { appEnv } from '../../config/env';
import { api } from '../../services/api';
import { withBrowserSessionLock } from './browserSessionLock.web';
import { settingsActorHeaders, type SessionActor } from './sessionActor';
import type { ChangePasswordInput } from '../../types/api';
import type {
  ApiEnvelope,
  BrowserAuthSessionResponse,
  LoginInput,
  RegisterInput,
  RegistrationResult,
  ResetPasswordInput,
  User,
  VerifyEmailInput
} from '../../types/api';

const publicApi = axios.create({
  baseURL: appEnv.apiBaseUrl,
  timeout: 10000,
  withCredentials: true,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
});

const data = <T>(response: { data: ApiEnvelope<T> }) => response.data.data;

export const authApi = {
  async register(input: RegisterInput) {
    return data<RegistrationResult>(await publicApi.post('/api/v1/auth/register', input));
  },
  async verifyEmail(input: VerifyEmailInput) {
    return withBrowserSessionLock(async () => data<BrowserAuthSessionResponse>(await publicApi.post('/api/v1/auth/browser/verify-email', input)));
  },
  async resendVerification(email: string) {
    return data<{ accepted: true }>(await publicApi.post('/api/v1/auth/resend-verification', { email }));
  },
  async login(input: LoginInput) {
    return withBrowserSessionLock(async () => data<BrowserAuthSessionResponse>(await publicApi.post('/api/v1/auth/browser/login', input)));
  },
  async refresh(actor?: SessionActor) {
    return data<BrowserAuthSessionResponse>(await publicApi.post('/api/v1/auth/browser/refresh', {}, { headers: actor ? settingsActorHeaders(actor) : {} }));
  },
  async logout(actor?: SessionActor) {
    return data<{ ok: true }>(await publicApi.post('/api/v1/auth/browser/logout', {}, { headers: actor ? settingsActorHeaders(actor) : {} }));
  },
  async logoutAll(accessToken: string, actor: SessionActor) {
    return data<{ ok: true }>(await publicApi.post('/api/v1/auth/browser/logout-all', {}, { headers: { ...settingsActorHeaders(actor), Authorization: 'Bearer ' + accessToken } }));
  },
  async changePassword(accessToken: string, input: ChangePasswordInput, actor: SessionActor) {
    return data<{ ok: true }>(await publicApi.post('/api/v1/auth/browser/change-password', input, { headers: { ...settingsActorHeaders(actor), Authorization: 'Bearer ' + accessToken } }));
  },
  async forgotPassword(email: string) {
    return data<{ accepted: true }>(await publicApi.post('/api/v1/auth/forgot-password', { email }));
  },
  async resetPassword(input: ResetPasswordInput) {
    return data<{ ok: true }>(await publicApi.post('/api/v1/auth/reset-password', input));
  },
  async me() {
    return data<User>(await api.get('/api/v1/auth/me'));
  }
};

export function authErrorMessage(error: unknown, fallback = 'Não foi possível concluir esta ação.') {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as { error?: { message?: string } } | undefined;
    return payload?.error?.message || fallback;
  }
  return fallback;
}
