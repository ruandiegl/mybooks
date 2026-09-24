import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { appEnv } from '../config/env';

type SessionAccessor = {
  getAccessToken: () => Promise<string | null>;
  refresh: () => Promise<boolean>;
  onUnauthorized: () => Promise<void>;
};

let sessionAccessor: SessionAccessor = {
  getAccessToken: async () => null,
  refresh: async () => false,
  onUnauthorized: async () => undefined
};
let refreshPromise: Promise<boolean> | null = null;
let unauthorizedPromise: Promise<void> | null = null;

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
  const token = await sessionAccessor.getAccessToken();
  config.headers = config.headers ?? {};

  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as (InternalAxiosRequestConfig & { _authRetry?: boolean }) | undefined;
    const isRefreshRequest = request?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && request && !request._authRetry && !isRefreshRequest) {
      request._authRetry = true;
      refreshPromise ??= sessionAccessor.refresh().finally(() => { refreshPromise = null; });
      const refreshed = await refreshPromise;

      if (refreshed) {
        const token = await sessionAccessor.getAccessToken();
        request.headers = request.headers ?? {};
        if (token) request.headers.Authorization = 'Bearer ' + token;
        return api.request(request);
      }
    }

    if (error.response?.status === 401) {
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
