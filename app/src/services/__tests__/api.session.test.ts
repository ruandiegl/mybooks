import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, configureApiSession } from '../api';

const originalAdapter = api.defaults.adapter;

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  configureApiSession({
    getAccessToken: async () => null,
    refresh: async () => false,
    onUnauthorized: async () => undefined
  });
});

const unauthorized = (config: InternalAxiosRequestConfig) => Promise.reject(new AxiosError(
  'unauthorized',
  'ERR_BAD_REQUEST',
  config,
  undefined,
  { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config }
));

describe('API native session interceptor', () => {
  it('single-flights refresh and retries concurrent requests once with the new token', async () => {
    let token = 'old-token';
    const refresh = vi.fn(async () => {
      await Promise.resolve();
      token = 'new-token';
      return true;
    });
    const onUnauthorized = vi.fn(async () => undefined);
    configureApiSession({ getAccessToken: async () => token, refresh, onUnauthorized });

    api.defaults.adapter = async (config): Promise<AxiosResponse> => {
      if (new AxiosHeaders(config.headers).get('Authorization') === 'Bearer old-token') {
        return unauthorized(config);
      }
      return { data: { data: { ok: true } }, status: 200, statusText: 'OK', headers: {}, config };
    };

    const [first, second] = await Promise.all([api.get('/one'), api.get('/two')]);

    expect([first.status, second.status]).toEqual([200, 200]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('clears the session once when refresh fails', async () => {
    const refresh = vi.fn(async () => false);
    const onUnauthorized = vi.fn(async () => undefined);
    configureApiSession({ getAccessToken: async () => 'expired', refresh, onUnauthorized });
    api.defaults.adapter = unauthorized;

    await expect(Promise.all([api.get('/one'), api.get('/two')])).rejects.toBeInstanceOf(AxiosError);
    await Promise.resolve();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
