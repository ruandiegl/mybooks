import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { AppError } from '../src/shared/errors/AppError.js';
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
  app.use('/api/v1/auth', createAuthRouter({ allowedOrigins: ['https://trocalivros.example'], ...options }));
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

  it('sets an HttpOnly refresh cookie and omits the refresh token from browser login JSON', async () => {
    const service = createFakeService();
    const browserRefreshToken = 'browser-refresh-token-'.padEnd(32, 'x');
    service.login = async (input, meta) => {
      service.calls.push(['login', input, meta]);
      return { accessToken: 'access', refreshToken: browserRefreshToken, expiresAt: new Date('2026-09-11T12:15:00Z'), user: { id: 'user-1' } };
    };
    const response = await request(makeApp({ service }))
      .post('/api/v1/auth/browser/login')
      .set('origin', 'https://trocalivros.example')
      .send({ email: 'leitora@example.com', password: 'Senha@123' });

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data).toEqual({
      accessToken: 'access',
      expiresAt: '2026-09-11T12:15:00.000Z',
      user: { id: 'user-1' }
    });
    expect(response.headers['set-cookie'][0]).toMatch(new RegExp(`^__Host-trocalivros_refresh=${browserRefreshToken};`));
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('Secure');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(response.headers['set-cookie'][0]).toContain('Path=/');
  });

  it('sets a browser refresh cookie after email verification and rejects a different origin', async () => {
    const service = createFakeService();
    const browserRefreshToken = 'verification-refresh-token-'.padEnd(32, 'x');
    service.verifyEmail = async (input, meta) => {
      service.calls.push(['verifyEmail', input, meta]);
      return { accessToken: 'access', refreshToken: browserRefreshToken, expiresAt: new Date('2026-09-11T12:15:00Z'), user: { id: 'user-1' } };
    };
    const app = makeApp({ service });
    const verified = await request(app)
      .post('/api/v1/auth/browser/verify-email')
      .set('origin', 'https://trocalivros.example')
      .send({ email: 'leitora@example.com', code: '123456' });

    expect(verified.status).toBe(200);
    expect(verified.body.data).not.toHaveProperty('refreshToken');
    expect(verified.headers['set-cookie'][0]).toMatch(new RegExp(`^__Host-trocalivros_refresh=${browserRefreshToken};`));

    const rejected = await request(app)
      .post('/api/v1/auth/browser/login')
      .set('origin', 'https://attacker.example')
      .send({ email: 'leitora@example.com', password: 'Senha@123' });
    expect(rejected.status).toBe(403);
    expect(service.calls).toHaveLength(1);
  });

  it('rotates a browser refresh cookie and never accepts a cross-origin refresh', async () => {
    const service = createFakeService();
    const browserRefreshToken = 'browser-refresh-token-'.padEnd(32, 'x');
    const app = makeApp({ service });
    const rotated = await request(app)
      .post('/api/v1/auth/browser/refresh')
      .set('origin', 'https://trocalivros.example')
      .set('cookie', `__Host-trocalivros_refresh=${browserRefreshToken}`);

    expect(rotated.status).toBe(200);
    expect(service.calls[0][0]).toBe('refresh');
    expect(service.calls[0][1]).toBe(browserRefreshToken);
    expect(rotated.body.data).not.toHaveProperty('refreshToken');
    expect(rotated.headers['set-cookie'][0]).toMatch(/^__Host-trocalivros_refresh=next-refresh;/);

    const crossOrigin = await request(app)
      .post('/api/v1/auth/browser/refresh')
      .set('origin', 'https://attacker.example')
      .set('cookie', `__Host-trocalivros_refresh=${browserRefreshToken}`);

    expect(crossOrigin.status).toBe(403);
    expect(service.calls).toHaveLength(1);
  });

  it('revokes and clears the browser refresh cookie on logout', async () => {
    const service = createFakeService();
    const browserRefreshToken = 'browser-refresh-token-'.padEnd(32, 'x');
    const response = await request(makeApp({ service }))
      .post('/api/v1/auth/browser/logout')
      .set('origin', 'https://trocalivros.example')
      .set('cookie', `__Host-trocalivros_refresh=${browserRefreshToken}`);

    expect(response.status).toBe(200);
    expect(service.calls.at(-1)).toEqual(['logout', { refreshToken: browserRefreshToken }]);
    expect(response.headers['set-cookie'][0]).toMatch(/^__Host-trocalivros_refresh=;/);
    expect(response.headers['set-cookie'][0]).toContain('Max-Age=0');
  });

  it('expires an invalid browser refresh cookie instead of leaving it to loop on reload', async () => {
    const service = createFakeService();
    service.refresh = async () => { throw new AppError('Sessão inválida.', { statusCode: 401, code: 'INVALID_SESSION' }); };
    const browserRefreshToken = 'browser-refresh-token-'.padEnd(32, 'x');
    const response = await request(makeApp({ service }))
      .post('/api/v1/auth/browser/refresh')
      .set('origin', 'https://trocalivros.example')
      .set('cookie', `__Host-trocalivros_refresh=${browserRefreshToken}`);

    expect(response.status).toBe(401);
    expect(response.headers['set-cookie'][0]).toContain('Max-Age=0');
  });

  it.each(['%E0%A4%A', ''])('expires a malformed or empty browser refresh cookie instead of leaving it to loop on reload', async (cookieValue) => {
    const service = createFakeService();
    const response = await request(makeApp({ service }))
      .post('/api/v1/auth/browser/refresh')
      .set('origin', 'https://trocalivros.example')
      .set('cookie', `__Host-trocalivros_refresh=${cookieValue}`);

    expect(response.status).toBe(401);
    expect(response.headers['set-cookie'][0]).toContain('Max-Age=0');
    expect(service.calls).toHaveLength(0);
  });

  it('preserves the browser refresh cookie after a transient refresh failure', async () => {
    const service = createFakeService();
    service.refresh = async () => { throw new Error('database unavailable'); };
    const browserRefreshToken = 'browser-refresh-token-'.padEnd(32, 'x');
    const response = await request(makeApp({ service }))
      .post('/api/v1/auth/browser/refresh')
      .set('origin', 'https://trocalivros.example')
      .set('cookie', `__Host-trocalivros_refresh=${browserRefreshToken}`);

    expect(response.status).toBe(500);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('clears the browser cookie even if server-side logout cannot complete', async () => {
    const service = createFakeService();
    service.logout = async () => { throw new Error('database unavailable'); };
    const browserRefreshToken = 'browser-refresh-token-'.padEnd(32, 'x');
    const response = await request(makeApp({ service }))
      .post('/api/v1/auth/browser/logout')
      .set('origin', 'https://trocalivros.example')
      .set('cookie', `__Host-trocalivros_refresh=${browserRefreshToken}`);

    expect(response.status).toBe(500);
    expect(response.headers['set-cookie'][0]).toContain('Max-Age=0');
  });
});
