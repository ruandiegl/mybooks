import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { appEnv } from '../config/env';

type SessionAccessor = {
  getAccessToken: () => Promise<string | null>;
  refresh: () => Promise<boolean>;
  onUnauthorized: () => Promise<void>;
  getIdentity?: () => string | null;
};

let sessionAccessor: SessionAccessor = {
  getAccessToken: async () => null,
  refresh: async () => false,
  onUnauthorized: async () => undefined
};
let refreshPromise: Promise<boolean> | null = null;
let unauthorizedPromise: Promise<void> | null = null;
let refreshOwner: string | null | undefined;
type OwnedRequest = InternalAxiosRequestConfig & { _authRetry?: boolean; _authOwner?: string | null };
const ownerIsCurrent = (request: OwnedRequest) => !sessionAccessor.getIdentity || request._authOwner === sessionAccessor.getIdentity();

export function configureApiSession(accessor: SessionAccessor) {
  sessionAccessor = accessor;
}

export const api = axios.create({
  baseURL: appEnv.apiBaseUrl,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(async (config) => {
  const owned = config as OwnedRequest;
  if (owned._authOwner === undefined) owned._authOwner = sessionAccessor.getIdentity?.() ?? null;
  if (!ownerIsCurrent(owned)) throw new AxiosError('A sessão mudou.', 'SESSION_CHANGED', config);
  const token = await sessionAccessor.getAccessToken();
  if (!ownerIsCurrent(owned)) throw new AxiosError('A sessão mudou.', 'SESSION_CHANGED', config);
  config.headers = config.headers ?? {};

  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as OwnedRequest | undefined;
    const isRefreshRequest = request?.url?.includes('/auth/refresh');

    if (request && !ownerIsCurrent(request)) return Promise.reject(error);
    if (error.response?.status === 401 && request && !request._authRetry && !isRefreshRequest) {
      request._authRetry = true;
      if (!refreshPromise || refreshOwner !== request._authOwner) {
        const ownPromise = sessionAccessor.refresh(); refreshPromise = ownPromise; refreshOwner = request._authOwner;
        void ownPromise.finally(() => { if (refreshPromise === ownPromise) { refreshPromise = null; refreshOwner = undefined; } }).catch(() => {});
      }
      let refreshed: boolean;
      try {
        refreshed = await refreshPromise;
      } catch (refreshError) {
        if (refreshError instanceof AxiosError) return Promise.reject(refreshError);
        const failure = refreshError as { response?: { status?: number; data?: unknown } };
        // Preserve Axios' caller contract without falsely labeling a transient refresh as401.
        const response = failure?.response?.status ? { status: failure.response.status, statusText: '', data: failure.response.data, headers: {}, config: request } : undefined;
        return Promise.reject(new AxiosError('Não foi possível renovar a sessão agora.', 'AUTH_REFRESH_UNAVAILABLE', request, undefined, response));
      }

      if (refreshed && ownerIsCurrent(request)) {
        const token = await sessionAccessor.getAccessToken();
        if (!ownerIsCurrent(request)) return Promise.reject(error);
        request.headers = request.headers ?? {};
        if (token) request.headers.Authorization = 'Bearer ' + token;
        return api.request(request);
      }
    }

    if (error.response?.status === 401 && (!request || ownerIsCurrent(request))) {
      unauthorizedPromise ??= sessionAccessor.onUnauthorized().finally(() => { unauthorizedPromise = null; });
      try {
        await unauthorizedPromise;
      } catch { /* limpeza local não deve mascarar o 401 original */ }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error: unknown, fallback = 'Não foi possível concluir a operação.') {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as { error?: { message?: string } } | undefined;
    return payload?.error?.message || fallback;
  }
  return fallback;
}
