import axios, { AxiosError } from 'axios';
import { appEnv } from '../config/env';

type SessionAccessor = {
  getToken: () => Promise<string | null>;
  devUserId?: string;
  onUnauthorized?: () => Promise<void>;
};

let sessionAccessor: SessionAccessor = {
  getToken: async () => null,
  devUserId: appEnv.devUserId
};
let handlingUnauthorized = false;

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
  const token = await sessionAccessor.getToken();
  config.headers = config.headers ?? {};

  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  } else if (sessionAccessor.devUserId) {
    config.headers['x-dev-user-id'] = sessionAccessor.devUserId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (
      error.response?.status === 401
      && sessionAccessor.onUnauthorized
      && !handlingUnauthorized
    ) {
      handlingUnauthorized = true;
      try {
        await sessionAccessor.onUnauthorized();
      } finally {
        handlingUnauthorized = false;
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error: unknown, fallback = 'Não foi possível concluir a operação.') {
  if (error instanceof AxiosError) {
    return error.response?.data?.error?.message || fallback;
  }
  return fallback;
}
