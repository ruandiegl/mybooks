import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/shared/errors/AppError.js';
import { errorHandler } from '../src/shared/http/errorHandler.js';
import { requestContext } from '../src/shared/http/requestContext.js';

const mocks = vi.hoisted(() => ({
  isbnService: { lookup: vi.fn() }
}));

vi.mock('../src/modules/isbn/isbn.service.js', () => ({
  isbnService: mocks.isbnService
}));

const previousLookupLimit = process.env.ISBN_LOOKUP_LIMIT;
const previousRateLimitWindow = process.env.ISBN_RATE_LIMIT_WINDOW_MS;
process.env.ISBN_LOOKUP_LIMIT = '2';
process.env.ISBN_RATE_LIMIT_WINDOW_MS = '60000';

const { isbnRouter } = await import('../src/modules/isbn/isbn.routes.js');
const { createApp } = await import('../src/app.js');

afterAll(() => {
  if (previousLookupLimit === undefined) delete process.env.ISBN_LOOKUP_LIMIT;
  else process.env.ISBN_LOOKUP_LIMIT = previousLookupLimit;

  if (previousRateLimitWindow === undefined) delete process.env.ISBN_RATE_LIMIT_WINDOW_MS;
  else process.env.ISBN_RATE_LIMIT_WINDOW_MS = previousRateLimitWindow;
});

function makeApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(requestContext);
  app.use((req, _res, next) => {
    if (req.headers['x-user-id']) req.currentUser = { id: req.headers['x-user-id'] };
    next();
  });
  app.get('/api/v1/control', (_req, res) => res.status(200).json({ data: { ok: true } }));
  app.use('/api/v1/isbn', isbnRouter);
  app.use(errorHandler);
  return app;
}

describe('ISBN schema and HTTP route', () => {
  beforeEach(() => {
    mocks.isbnService.lookup.mockReset();
    mocks.isbnService.lookup.mockResolvedValue({ isbn: '9788545702870', status: 'FOUND' });
  });

  it('aceita e recorta apenas parâmetros ISBN estritos', async () => {
    const { isbnParamsSchema } = await import('../src/modules/isbn/isbn.schemas.js');

    expect(isbnParamsSchema.parse({ isbn: ' 978-85-457-0287-0 ' })).toEqual({ isbn: '978-85-457-0287-0' });
    expect(isbnParamsSchema.safeParse({ isbn: '9788545702870', extra: 'não permitido' }).success).toBe(false);
    expect(isbnParamsSchema.safeParse({ isbn: '1'.repeat(33) }).success).toBe(false);

    const invalid = isbnParamsSchema.safeParse({ isbn: '978854570!' });
    expect(invalid.success).toBe(false);
    expect(invalid.error.issues[0].message).toMatch(/[áàâãéêíóôõúç]/i);
  });

  it.each([
    ['maior que 32 caracteres', '1'.repeat(33)],
    ['fora da regex permitida', '978854570!']
  ])('rejeita parâmetro %s no controller sem consultar o service', async (_label, isbn) => {
    const response = await request(makeApp())
      .get(`/api/v1/isbn/${isbn}`)
      .set('x-user-id', `invalid-user-${isbn.length}`);

    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Revise os dados enviados.',
      fields: { isbn: expect.any(String) }
    });
    expect(mocks.isbnService.lookup).not.toHaveBeenCalled();
  });

  it('mantém o endpoint privado pela autenticação global', async () => {
    const response = await request(createApp()).get('/api/v1/isbn/9788545702870');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
    expect(mocks.isbnService.lookup).not.toHaveBeenCalled();
  });

  it.each([
    ['ISBN_INVALID', 422],
    ['ISBN_NOT_FOUND', 404],
    ['ISBN_PROVIDER_RATE_LIMITED', 503],
    ['ISBN_PROVIDER_UNAVAILABLE', 503]
  ])('retorna envelope seguro para %s', async (code, statusCode) => {
    mocks.isbnService.lookup.mockRejectedValue(new AppError('Mensagem segura.', {
      code,
      statusCode,
      cause: new Error('payload bruto do provedor')
    }));

    const response = await request(makeApp())
      .get('/api/v1/isbn/9788545702870')
      .set('x-user-id', `error-${code}`);

    expect(response.status).toBe(statusCode);
    expect(response.body.error).toMatchObject({ code, message: 'Mensagem segura.' });
    expect(JSON.stringify(response.body)).not.toContain('payload bruto do provedor');
  });

  it('limita a terceira consulta do mesmo usuário apenas na rota ISBN', async () => {
    const app = makeApp();

    const first = await request(app).get('/api/v1/isbn/9788545702870').set('x-user-id', 'rate-user');
    const second = await request(app).get('/api/v1/isbn/9788545702870').set('x-user-id', 'rate-user');
    const third = await request(app).get('/api/v1/isbn/9788545702870').set('x-user-id', 'rate-user');
    const otherUser = await request(app).get('/api/v1/isbn/9788545702870').set('x-user-id', 'other-user');
    const control = await request(app).get('/api/v1/control').set('x-user-id', 'rate-user');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(otherUser.status).toBe(200);
    expect(control.status).toBe(200);
    expect(third.headers['ratelimit-limit']).toBe('2');
    expect(third.headers['x-ratelimit-limit']).toBeUndefined();
    expect(third.body.error).toMatchObject({
      code: 'RATE_LIMITED',
      message: expect.stringMatching(/aguarde|tente novamente/i)
    });
    expect(JSON.stringify(third.body)).not.toContain('9788545702870');
    expect(mocks.isbnService.lookup).toHaveBeenCalledTimes(3);
  });

  it('usa IP normalizado como fallback quando não há usuário no request', async () => {
    const app = makeApp();
    const fromIp = () => request(app)
      .get('/api/v1/isbn/9788545702870')
      .set('x-forwarded-for', '2001:db8::1');

    expect((await fromIp()).status).toBe(200);
    expect((await fromIp()).status).toBe(200);
    expect((await fromIp()).status).toBe(429);
    expect((await request(app)
      .get('/api/v1/isbn/9788545702870')
      .set('x-forwarded-for', '2001:db8:1::1')).status).toBe(200);
  });
});
