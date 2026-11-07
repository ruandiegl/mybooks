import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { hashPassword } from '../src/modules/auth/auth.crypto.js';
import { errorHandler } from '../src/shared/http/errorHandler.js';
import { AppError } from '../src/shared/errors/AppError.js';
const sid = '10000000-0000-4000-8000-000000000001';
describe('authenticated account security', () => {
  it('requires the current password and explicit confirmation before deleting an account', async () => {
    const passwordHash = await hashPassword('Senha@123');
    const repository = { findUserByIdForAuth: async () => ({ id: 'ana', passwordHash }), deleteAccountAndSessions: vi.fn(async () => ({ status: 'DELETED', userId: 'ana', sessionIds: [sid], removedMatches: [] })) };
    const publish = vi.fn();
    const service = createAuthService({ repository, revocationPublisher: publish });
    await expect(service.deleteAccount('ana', sid, { currentPassword: 'Errada@123', confirmation: 'EXCLUIR' })).rejects.toMatchObject({ statusCode: 403, code: 'CURRENT_PASSWORD_INVALID' });
    await expect(service.deleteAccount('ana', sid, { currentPassword: 'Senha@123', confirmation: 'excluir' })).rejects.toMatchObject({ name: 'ZodError' });
    expect(repository.deleteAccountAndSessions).not.toHaveBeenCalled();
    await expect(service.deleteAccount('ana', sid, { currentPassword: 'Senha@123', confirmation: 'EXCLUIR' })).resolves.toEqual({ ok: true, removedMatches: [] });
    expect(repository.deleteAccountAndSessions).toHaveBeenCalledWith(expect.objectContaining({ userId: 'ana', sessionId: sid, expectedPasswordHash: passwordHash }));
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ userId: 'ana', sessionIds: [sid] }));
  });
  it('clears the browser cookie only after account deletion succeeds', async () => {
    const deleteAccount = vi.fn().mockRejectedValueOnce(new AppError('wrong password', { statusCode: 403, code: 'CURRENT_PASSWORD_INVALID' })).mockResolvedValueOnce({ ok: true, removedMatches: [] });
    const app = express(); app.set('trust proxy', 1); app.use(express.json());
    app.use('/auth', createAuthRouter({ service: { deleteAccount }, allowedOrigins: ['https://settings.example.test'], authenticateMiddleware: (req, _res, next) => { req.currentUser = { id: 'ana' }; req.identity = { userId: 'ana', sessionId: sid }; next(); } })); app.use(errorHandler);
    const post = () => request(app).post('/auth/browser/delete-account').set('Origin', 'https://settings.example.test').set('X-Forwarded-Proto', 'https').set('X-Settings-Owner', 'ana').set('X-Settings-Session', sid).set('Cookie', '__Host-trocalivros_refresh=refresh-token');
    const wrong = await post().send({ currentPassword: 'wrong', confirmation: 'EXCLUIR' });
    expect(wrong.status).toBe(403); expect(wrong.headers['set-cookie']).toBeUndefined();
    const invalid = await post().send({ currentPassword: 'Senha@123', confirmation: 'excluir' });
    expect(invalid.status).toBe(422); expect(deleteAccount).toHaveBeenCalledTimes(1);
    const success = await post().send({ currentPassword: 'Senha@123', confirmation: 'EXCLUIR' });
    expect(success.status).toBe(200); expect(success.body).toEqual({ data: { ok: true } });
    expect(success.headers['set-cookie'][0]).toContain('__Host-trocalivros_refresh=; Max-Age=0');
  });
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
