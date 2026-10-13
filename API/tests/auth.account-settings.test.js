import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { hashPassword } from '../src/modules/auth/auth.crypto.js';
import { errorHandler } from '../src/shared/http/errorHandler.js';
const sid = '10000000-0000-4000-8000-000000000001';
describe('authenticated account security', () => {
  it('rejects a wrong current password with403 and never changes data or revokes', async () => {
    const repository = { findUserByIdForAuth: async () => ({ id: 'ana', passwordHash: await hashPassword('Senha@123') }), changePasswordAndRevokeSessions: vi.fn() };
    const service = createAuthService({ repository });
    expect(service.changePassword).toBeTypeOf('function');
    await expect(service.changePassword('ana', sid, { currentPassword: 'Errada@123', newPassword: 'NovaSenha@123' })).rejects.toMatchObject({ statusCode: 403, code: 'CURRENT_PASSWORD_INVALID' });
    expect(repository.changePasswordAndRevokeSessions).not.toHaveBeenCalled();
  });
  it('validates new password before expensive work and does not trim password input', async () => {
    const repository = { findUserByIdForAuth: vi.fn() };
    const service = createAuthService({ repository });
    expect(service.changePassword).toBeTypeOf('function');
    await expect(service.changePassword('ana', sid, { currentPassword: 'a', newPassword: 'weak' })).rejects.toMatchObject({ name: 'ZodError' });
    expect(repository.findUserByIdForAuth).not.toHaveBeenCalled();
  });
  it('returns409 for a stale proof and never publishes revocation on failure', async () => {
    const passwordHash = await hashPassword('Senha@123');
    const publish = vi.fn();
    const service = createAuthService({ repository: { findUserByIdForAuth: async () => ({ passwordHash }), changePasswordAndRevokeSessions: async () => ({ status: 'CHANGED_SESSION' }) }, revocationPublisher: publish });
    expect(service.changePassword).toBeTypeOf('function');
    await expect(service.changePassword('ana', sid, { currentPassword: 'Senha@123', newPassword: 'NovaSenha@123' })).rejects.toMatchObject({ statusCode: 409 });
    expect(publish).not.toHaveBeenCalled();
  });
  it('limits password attempts per account independently from IP', async () => {
    const service = { changePassword: async () => { const error = new Error('wrong'); error.statusCode = 403; error.code = 'CURRENT_PASSWORD_INVALID'; throw error; } };
    const app = express(); app.set('trust proxy', 1); app.use(express.json());
    app.use('/auth', createAuthRouter({ service, authenticateMiddleware: (req, _res, next) => { req.currentUser = { id: 'ana' }; req.identity = { userId: 'ana', sessionId: sid }; next(); } })); app.use(errorHandler);
    for (let n = 0; n < 5; n++) expect((await request(app).post('/auth/change-password').set('X-Forwarded-For', `127.0.0.${n+1}`).send({ currentPassword: 'wrong', newPassword: 'Nova@123' })).status).not.toBe(404);
    expect((await request(app).post('/auth/change-password').set('X-Forwarded-For', '127.0.0.9').send({ currentPassword: 'wrong', newPassword: 'Nova@123' })).status).toBe(429);
  });
});
