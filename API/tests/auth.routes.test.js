import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { errorHandler } from '../src/shared/http/errorHandler.js';
import { requestContext } from '../src/shared/http/requestContext.js';

function createFakeService() {
  return {
    calls: [],
    async register(input) {
      this.calls.push(['register', input]);
      return { userId: 'user-1', email: input.email.trim().toLowerCase(), requiresEmailVerification: true };
    },
    async verifyEmail(input, meta) {
      this.calls.push(['verifyEmail', input, meta]);
      return { accessToken: 'access', refreshToken: 'refresh', expiresAt: new Date('2026-09-11T12:15:00Z'), user: { id: 'user-1' } };
    },
    async resendVerification(input) { this.calls.push(['resendVerification', input]); return { accepted: true }; },
    async login(input, meta) { this.calls.push(['login', input, meta]); return { accessToken: 'access', refreshToken: 'refresh', expiresAt: new Date('2026-09-11T12:15:00Z'), user: { id: 'user-1' } }; },
    async refresh(token, meta) { this.calls.push(['refresh', token, meta]); return { accessToken: 'next', refreshToken: 'next-refresh', expiresAt: new Date('2026-09-11T12:15:00Z'), user: { id: 'user-1' } }; },
    async logout(input) { this.calls.push(['logout', input]); return { ok: true }; },
    async logoutAll(userId) { this.calls.push(['logoutAll', userId]); return { ok: true }; },
    async requestPasswordReset(input) { this.calls.push(['requestPasswordReset', input]); return { accepted: true }; },
    async resetPassword(input) { this.calls.push(['resetPassword', input]); return { ok: true }; }
  };
}

function makeApp(options = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(requestContext);
  app.use(express.json());
  app.use('/api/v1/auth', createAuthRouter(options));
  app.use(errorHandler);
  return app;
}

describe('auth HTTP routes', () => {
  it('creates a pending account with the standard envelope', async () => {
    const service = createFakeService();
    const response = await request(makeApp({ service })).post('/api/v1/auth/register').send({
      email: ' LEITORA@EXAMPLE.COM ', password: 'Senha@123', cpf: '529.982.247-25', phone: '(11) 91234-5678'
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: { userId: 'user-1', email: 'leitora@example.com', requiresEmailVerification: true } });
    expect(response.headers['ratelimit']).toBeTruthy();
    expect(response.headers['x-ratelimit-limit']).toBeUndefined();
  });

  it('passes request metadata to login and returns tokens', async () => {
    const service = createFakeService();
    const response = await request(makeApp({ service }))
      .post('/api/v1/auth/login')
      .set('user-agent', 'trocalivros-test')
      .send({ email: 'leitora@example.com', password: 'x' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ accessToken: 'access', refreshToken: 'refresh' });
    expect(service.calls[0][2]).toMatchObject({ userAgent: 'trocalivros-test', ip: expect.any(String) });
  });

  it('keeps recovery responses generic and exposes logout as data', async () => {
    const service = createFakeService();
    const app = makeApp({ service });

    expect((await request(app).post('/api/v1/auth/forgot-password').send({ email: 'x@example.com' })).body)
      .toEqual({ data: { accepted: true } });
    expect((await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'x'.repeat(32) })).body)
      .toEqual({ data: { ok: true } });
  });

  it('protects me and logout-all with the injected authentication middleware', async () => {
    const service = createFakeService();
    const authenticateMiddleware = (req, _res, next) => {
      req.currentUser = { id: 'user-1' };
      next();
    };
    const getMe = async (userId) => ({ id: userId, name: 'Leitora' });
    const app = makeApp({ service, authenticateMiddleware, getMe });

    const me = await request(app).get('/api/v1/auth/me');
    const logoutAll = await request(app).post('/api/v1/auth/logout-all');

    expect(me.status).toBe(200);
    expect(me.body).toEqual({ data: { id: 'user-1', name: 'Leitora' } });
    expect(logoutAll.body).toEqual({ data: { ok: true } });
    expect(service.calls.at(-1)).toEqual(['logoutAll', 'user-1']);
  });

  it('applies a route-specific limit using standard headers', async () => {
    const service = createFakeService();
    const app = makeApp({ service, limits: { register: { windowMs: 60_000, limit: 1 } } });
    const payload = { email: 'x@example.com', password: 'Senha@123', cpf: '52998224725', phone: '11912345678' };

    expect((await request(app).post('/api/v1/auth/register').send(payload)).status).toBe(201);
    const limited = await request(app).post('/api/v1/auth/register').send(payload);
    expect(limited.status).toBe(429);
    expect(limited.headers['ratelimit']).toBeTruthy();
    expect(limited.body.error.code).toBe('RATE_LIMITED');
  });
});
