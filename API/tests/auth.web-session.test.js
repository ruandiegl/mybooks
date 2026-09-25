import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { errorHandler } from '../src/shared/http/errorHandler.js';
import { requestContext } from '../src/shared/http/requestContext.js';

const webOrigin = 'https://localhost:8081';
const refreshCookie = 'trocalivros_refresh';

function createFakeService() {
  return {
    calls: [],
    async register(input) { this.calls.push(['register', input]); return { userId: 'user-1', email: input.email, requiresEmailVerification: true }; },
    async verifyEmail(input, meta) {
      this.calls.push(['verifyEmail', input, meta]);
      return { accessToken: 'access', refreshToken: 'refresh', expiresAt: '2026-09-24T12:15:00.000Z', user: { id: 'user-1' } };
    },
    async resendVerification(input) { this.calls.push(['resendVerification', input]); return { accepted: true }; },
    async login(input, meta) {
      this.calls.push(['login', input, meta]);
      return { accessToken: 'access', refreshToken: 'refresh', expiresAt: '2026-09-24T12:15:00.000Z', user: { id: 'user-1' } };
    },
    async refresh(token, meta) {
      this.calls.push(['refresh', token, meta]);
      return { accessToken: 'next', refreshToken: 'next-refresh', expiresAt: '2026-09-24T12:15:00.000Z', user: { id: 'user-1' } };
    },
    async logout(input) { this.calls.push(['logout', input]); return { ok: true }; },
    async logoutAll(userId) { this.calls.push(['logoutAll', userId]); return { ok: true }; },
    async requestPasswordReset(input) { this.calls.push(['requestPasswordReset', input]); return { accepted: true }; },
    async resetPassword(input) { this.calls.push(['resetPassword', input]); return { ok: true }; }
  };
}

function createTestApp(service) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(requestContext);
  app.use(express.json());
  app.use('/api/v1/auth', createAuthRouter({ service }));
  app.use(errorHandler);
  return app;
}

function cookieRequest(app, method, path) {
  return request(app)[method](path)
    .set('Origin', webOrigin)
    .set('X-Forwarded-Proto', 'https')
    .set('X-Session-Transport', 'cookie');
}

beforeAll(() => {
  if (!env.CLIENT_ORIGINS.includes(webOrigin)) env.CLIENT_ORIGINS.push(webOrigin);
});
afterAll(() => {
  env.CLIENT_ORIGINS = env.CLIENT_ORIGINS.filter(origin => origin !== webOrigin);
});

describe('web cookie sessions', () => {
  it('sets a secure HttpOnly refresh cookie at login and omits the refresh token from JSON', async () => {
    const service = createFakeService();
    const response = await cookieRequest(createTestApp(service), 'post', '/api/v1/auth/login')
      .send({ email: 'reader@example.com', password: 'TrocaLivros1!' });

    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty('refreshToken');
    expect(response.body.data.accessToken).toBe('access');
    expect(response.headers['set-cookie'][0]).toContain(`${refreshCookie}=refresh`);
    expect(response.headers['set-cookie'][0]).toMatch(/Max-Age=2592000/i);
    expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    expect(response.headers['set-cookie'][0]).toMatch(/Secure/i);
    expect(response.headers['set-cookie'][0]).toMatch(/SameSite=Strict/i);
    expect(response.headers['set-cookie'][0]).toMatch(/Path=\/api\/v1\/auth/i);
  });

  it('rotates the refresh cookie and revokes that same cookie session at logout', async () => {
    const service = createFakeService();
    const app = createTestApp(service);
    const refresh = await cookieRequest(app, 'post', '/api/v1/auth/refresh')
      .set('Cookie', `${refreshCookie}=refresh`)
      .send({});

    expect(refresh.status).toBe(200);
    expect(refresh.body.data).not.toHaveProperty('refreshToken');
    expect(service.calls[0][0]).toBe('refresh');
    expect(service.calls[0][1]).toBe('refresh');
    expect(refresh.headers['set-cookie'][0]).toContain(`${refreshCookie}=next-refresh`);

    const logout = await cookieRequest(app, 'post', '/api/v1/auth/logout')
      .set('Cookie', `${refreshCookie}=next-refresh`)
      .send({});
    expect(logout.status).toBe(200);
    expect(service.calls[1]).toEqual(['logout', { refreshToken: 'next-refresh' }]);
    expect(logout.headers['set-cookie'][0]).toMatch(/Max-Age=0/i);
  });

  it('keeps the refresh cookie when revocation fails so logout can be retried', async () => {
    const service = createFakeService();
    let shouldFail = true;
    service.logout = async (input) => {
      service.calls.push(['logout', input]);
      if (shouldFail) throw new Error('database unavailable');
      return { ok: true };
    };
    const app = createTestApp(service);

    const failedLogout = await cookieRequest(app, 'post', '/api/v1/auth/logout')
      .set('Cookie', `${refreshCookie}=refresh`)
      .send({});

    expect(failedLogout.status).toBe(500);
    expect(failedLogout.headers['set-cookie']).toBeUndefined();

    shouldFail = false;
    const retriedLogout = await cookieRequest(app, 'post', '/api/v1/auth/logout')
      .set('Cookie', `${refreshCookie}=refresh`)
      .send({});

    expect(retriedLogout.status).toBe(200);
    expect(service.calls).toEqual([
      ['logout', { refreshToken: 'refresh' }],
      ['logout', { refreshToken: 'refresh' }]
    ]);
    expect(retriedLogout.headers['set-cookie'][0]).toMatch(/Max-Age=0/i);
  });

  it('uses the same cookie transport after email verification', async () => {
    const response = await cookieRequest(createTestApp(createFakeService()), 'post', '/api/v1/auth/verify-email')
      .send({ email: 'reader@example.com', code: '123456' });

    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty('refreshToken');
    expect(response.headers['set-cookie'][0]).toContain(`${refreshCookie}=refresh`);
  });

  it('rejects an untrusted origin and refuses cookie sessions over HTTP', async () => {
    const service = createFakeService();
    const app = createTestApp(service);
    const untrusted = await request(app).post('/api/v1/auth/login')
      .set('Origin', 'https://attacker.example')
      .set('X-Session-Transport', 'cookie')
      .send({ email: 'reader@example.com', password: 'TrocaLivros1!' });
    expect(untrusted.status).toBe(403);
    expect(untrusted.body.error.code).toBe('WEB_ORIGIN_NOT_ALLOWED');

    const missingOrigin = await request(app).post('/api/v1/auth/login')
      .set('X-Session-Transport', 'cookie')
      .send({ email: 'reader@example.com', password: 'TrocaLivros1!' });
    expect(missingOrigin.status).toBe(403);
    expect(missingOrigin.body.error.code).toBe('WEB_ORIGIN_NOT_ALLOWED');

    const insecure = await request(app).post('/api/v1/auth/login')
      .set('Origin', webOrigin)
      .set('X-Session-Transport', 'cookie')
      .send({ email: 'reader@example.com', password: 'TrocaLivros1!' });
    expect(insecure.status).toBe(400);
    expect(insecure.body.error.code).toBe('HTTPS_REQUIRED_FOR_WEB_SESSION');
    expect(service.calls).toHaveLength(0);
  });

  it('rejects cookie refresh without a refresh cookie', async () => {
    const service = createFakeService();
    const response = await cookieRequest(createTestApp(service), 'post', '/api/v1/auth/refresh').send({});

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_SESSION');
    expect(service.calls).toHaveLength(0);
    expect(response.headers['set-cookie'][0]).toMatch(/Max-Age=0/i);
  });
});
