import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
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

  it('ignora a identidade local removida', async () => {
    const response = await request(app).get('/api/v1/me').set('x-dev-user-id', 'admin');

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

  it('mascara o ISBN e remove sua query do caminho registrado', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await request(createApp()).get('/api/v1/isbn/9788545702870?source=camera');
      const requestLog = JSON.parse(info.mock.calls.at(-1)[0]);
      const errorLog = JSON.parse(warn.mock.calls.at(-1)[0]);

      expect(requestLog.path).toBe('/api/v1/isbn/:isbn');
      expect(errorLog.path).toBe('/api/v1/isbn/:isbn');
      expect(JSON.stringify([requestLog, errorLog])).not.toContain('9788545702870');
      expect(JSON.stringify([requestLog, errorLog])).not.toContain('source=camera');
    } finally {
      info.mockRestore();
      warn.mockRestore();
    }
  });

  it('preserva caminho e query de rotas que não são ISBN', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    try {
      await request(createApp()).get('/health?probe=full');
      const log = JSON.parse(info.mock.calls.at(-1)[0]);

      expect(log.path).toBe('/health?probe=full');
    } finally {
      info.mockRestore();
    }
  });
});
