import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('HTTP foundation', () => {
  const app = createApp();

  it('responde ao health check', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      status: 'ok',
      service: 'mybooks-api'
    });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('protege endpoints privados no modo de desenvolvimento', async () => {
    const response = await request(app).get('/api/v1/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('retorna contrato previsível para rota inexistente', async () => {
    const response = await request(app).get('/nao-existe');

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: 'ROUTE_NOT_FOUND',
      message: 'Rota não encontrada.'
    });
  });
});
