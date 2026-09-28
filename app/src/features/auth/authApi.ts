import axios, { AxiosError } from 'axios';
import { appEnv } from '../../config/env';
import { api } from '../../services/api';
import type {
  ApiEnvelope,
  AuthSessionResponse,
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
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
});

const data = <T>(response: { data: ApiEnvelope<T> }) => response.data.data;

export const authApi = {
  async register(input: RegisterInput) {
    return data<RegistrationResult>(await publicApi.post('/api/v1/auth/register', input));
  },
  async verifyEmail(input: VerifyEmailInput) {
    return data<AuthSessionResponse | BrowserAuthSessionResponse>(await publicApi.post('/api/v1/auth/verify-email', input));
  },
  async resendVerification(email: string) {
    return data<{ accepted: true }>(await publicApi.post('/api/v1/auth/resend-verification', { email }));
  },
  async login(input: LoginInput) {
    return data<AuthSessionResponse | BrowserAuthSessionResponse>(await publicApi.post('/api/v1/auth/login', input));
  },
  async refresh(refreshToken?: string) {
    if (!refreshToken) throw new Error('Não há token nativo para renovar a sessão.');
    return data<AuthSessionResponse | BrowserAuthSessionResponse>(await publicApi.post('/api/v1/auth/refresh', { refreshToken }));
  },
  async logout(refreshToken?: string) {
    if (!refreshToken) throw new Error('Não há token nativo para encerrar a sessão no servidor.');
    return data<{ ok: true }>(await publicApi.post('/api/v1/auth/logout', { refreshToken }));
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
