import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import { appEnv } from '../../config/env';
import { canUseWebAuthTransport, shouldUseCookieSession, withCookieRefreshLock } from './sessionTransport';
import { api } from '../../services/api';
import type {
  ApiEnvelope,
  AuthSessionResponse,
  LoginInput,
  RegisterInput,
  RegistrationResult,
  ResetPasswordInput,
  User,
  VerifyEmailInput
} from '../../types/api';

const pageProtocol = Platform.OS === 'web' && typeof window !== 'undefined'
  ? window.location.protocol
  : null;
const pageOrigin = Platform.OS === 'web' && typeof window !== 'undefined'
  ? window.location.origin
  : null;
const pageHostname = Platform.OS === 'web' && typeof window !== 'undefined'
  ? window.location.hostname
  : null;

const sessionTransportInput = {
  platform: Platform.OS,
  pageProtocol,
  pageOrigin,
  pageHostname,
  apiBaseUrl: appEnv.apiBaseUrl
};

export const usesCookieSession = shouldUseCookieSession(sessionTransportInput);
const supportsCookieRefreshLock = Platform.OS !== 'web'
  || (typeof navigator !== 'undefined' && Boolean((navigator as Navigator & { locks?: unknown }).locks));
const authTransportAvailable = canUseWebAuthTransport(sessionTransportInput)
  && (!usesCookieSession || supportsCookieRefreshLock);

function assertAuthTransportAvailable() {
  if (!authTransportAvailable) {
    if (usesCookieSession && !supportsCookieRefreshLock) {
      throw new Error('Atualize o navegador para sincronizar a renovação segura da sessão.');
    }
    throw new Error('Por segurança, acesse a PWA por HTTPS e publique a API no mesmo endereço por um proxy /api. Em desenvolvimento, HTTP é permitido apenas em localhost.');
  }
}

const sessionRequestConfig = usesCookieSession
  ? { withCredentials: true, headers: { 'X-Session-Transport': 'cookie' } }
  : {};

const publicApi = axios.create({
  baseURL: appEnv.apiBaseUrl,
  timeout: 10000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
});

const data = <T>(response: { data: ApiEnvelope<T> }) => response.data.data;

export const authApi = {
  async register(input: RegisterInput) {
    assertAuthTransportAvailable();
    return data<RegistrationResult>(await publicApi.post('/api/v1/auth/register', input));
  },
  async verifyEmail(input: VerifyEmailInput) {
    assertAuthTransportAvailable();
    return data<AuthSessionResponse>(await publicApi.post('/api/v1/auth/verify-email', input, sessionRequestConfig));
  },
  async resendVerification(email: string) {
    assertAuthTransportAvailable();
    return data<{ accepted: true }>(await publicApi.post('/api/v1/auth/resend-verification', { email }));
  },
  async login(input: LoginInput) {
    assertAuthTransportAvailable();
    return data<AuthSessionResponse>(await publicApi.post('/api/v1/auth/login', input, sessionRequestConfig));
  },
  async refresh(refreshToken: string | null) {
    assertAuthTransportAvailable();
    if (!usesCookieSession && !refreshToken) throw new Error('Token de sessão ausente.');
    const body = usesCookieSession ? {} : { refreshToken };
    const response = await withCookieRefreshLock(usesCookieSession, () =>
      publicApi.post<ApiEnvelope<AuthSessionResponse>>('/api/v1/auth/refresh', body, sessionRequestConfig)
    );
    return data<AuthSessionResponse>(response);
  },
  async logout(refreshToken: string | null) {
    assertAuthTransportAvailable();
    if (!usesCookieSession && !refreshToken) throw new Error('Token de sessão ausente.');
    const body = usesCookieSession ? {} : { refreshToken };
    return data<{ ok: true }>(await publicApi.post('/api/v1/auth/logout', body, sessionRequestConfig));
  },
  async forgotPassword(email: string) {
    assertAuthTransportAvailable();
    return data<{ accepted: true }>(await publicApi.post('/api/v1/auth/forgot-password', { email }));
  },
  async resetPassword(input: ResetPasswordInput) {
    assertAuthTransportAvailable();
    return data<{ ok: true }>(await publicApi.post('/api/v1/auth/reset-password', input));
  },
  async me() {
    assertAuthTransportAvailable();
    return data<User>(await api.get('/api/v1/auth/me'));
  }
};

export function authErrorMessage(error: unknown, fallback = 'Não foi possível concluir esta ação.') {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as { error?: { message?: string } } | undefined;
    return payload?.error?.message || fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
