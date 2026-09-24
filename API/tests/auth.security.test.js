import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { errorHandler } from '../src/shared/http/errorHandler.js';
import { requestContext } from '../src/shared/http/requestContext.js';

const accepted = { accepted: true };
const session = {
  accessToken: 'access-token', refreshToken: 'r'.repeat(64), expiresAt: new Date().toISOString(),
  user: { id: 'user-1', email: 'reader@example.com', isActive: true, interests: [] }
};

const service = {
  register: vi.fn(async () => ({ userId: 'user-1', email: 'reader@example.com', requiresEmailVerification: true })),
  verifyEmail: vi.fn(async () => session),
  resendVerification: vi.fn(async () => accepted),
  login: vi.fn(async () => session),
  refresh: vi.fn(async () => session),
  logout: vi.fn(async () => ({ ok: true })),
  logoutAll: vi.fn(async () => ({ ok: true })),
  requestPasswordReset: vi.fn(async () => accepted),
  resetPassword: vi.fn(async () => ({ ok: true }))
};

const limits = Object.fromEntries(['register', 'verify', 'resend', 'login', 'refresh', 'forgot', 'reset', 'logout'].map((key) => [key, { limit: 1, windowMs: 60_000 }]));
const app = express();
app.use(express.json());
app.use(requestContext);
app.use('/auth', createAuthRouter({ service, limits }));
app.use(errorHandler);

const cases = [
  ['/auth/register', { email: 'reader@example.com', password: 'Senha@123', cpf: '529.982.247-25', phone: '(11) 91234-5678' }],
  ['/auth/verify-email', { email: 'reader@example.com', code: '123456' }],
  ['/auth/resend-verification', { email: 'reader@example.com' }],
  ['/auth/login', { email: 'reader@example.com', password: 'wrong' }],
  ['/auth/refresh', { refreshToken: 'r'.repeat(64) }],
  ['/auth/logout', { refreshToken: 'r'.repeat(64) }],
  ['/auth/forgot-password', { email: 'reader@example.com' }],
  ['/auth/reset-password', { email: 'reader@example.com', code: '123456', password: 'Nova@123' }]
];

describe('authentication abuse controls', () => {
  it.each(cases)('rate limits %s independently without legacy headers', async (path, body) => {
    const first = await request(app).post(path).send(body);
    const second = await request(app).post(path).send(body);

    expect(first.status).toBeLessThan(400);
    expect(first.headers.ratelimit).toBeTruthy();
    expect(first.headers['x-ratelimit-limit']).toBeUndefined();
    expect(second.status).toBe(429);
    expect(second.body.error).toMatchObject({ code: 'RATE_LIMITED' });
    expect(JSON.stringify(second.body)).not.toMatch(/Senha@123|52998224725|r{32}/);
  });
});
