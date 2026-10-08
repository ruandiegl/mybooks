import { AxiosError, AxiosHeaders } from 'axios';
import { expect, it, vi } from 'vitest';
import { api, configureApiSession } from '../../../services/api';
it('does not clear a new account for an old request that receives401', async () => {
  let identity = 'ana:1', token = 'ana-token';
  const clear = vi.fn().mockResolvedValue(undefined), refresh = vi.fn().mockResolvedValue(false);
  configureApiSession({ getAccessToken: async () => token, getIdentity: () => identity, refresh, onUnauthorized: clear });
  let reject!: (error: unknown) => void, started!: () => void;
  const sent = new Promise<void>(resolve => { started = resolve; });
  const request = api.get('/test', { adapter: config => new Promise((_resolve, fail) => {
    reject = () => fail(new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, undefined, { data: {}, status: 401, statusText: 'Unauthorized', headers: new AxiosHeaders(), config }));
    started();
  }) });
  const result = expect(request).rejects.toMatchObject({ response: { status: 401 } });
  await sent; identity = 'bia:2'; token = 'bia-token'; reject(undefined); await result;
  expect(clear).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
});
