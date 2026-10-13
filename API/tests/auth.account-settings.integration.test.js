import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { createAuthRepository } from '../src/modules/auth/auth.repository.js';
import express from 'express';
import request from 'supertest';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { createAuthenticate } from '../src/modules/auth/auth.middleware.js';
import { createOpaqueToken, hashOpaqueToken, hashPassword, signAccessToken, verifyAccessToken } from '../src/modules/auth/auth.crypto.js';
import { errorHandler } from '../src/shared/http/errorHandler.js';
const url = process.env.SETTINGS_TEST_DATABASE_URL;
if (url && (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith('/plan010_test'))) throw Error('Account tests require disposable loopback plan010_test DB.');
const integration = url ? describe : describe.skip;
const client = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
const ids = [];
async function fixture() {
  const user = await client.user.create({ data: { name: 'Settings fixture', email: `security-${randomUUID()}@example.test`, passwordHash: 'old-hash', isActive: true, emailVerifiedAt: new Date() } }); ids.push(user.id);
  const refreshToken = createOpaqueToken(48), otherRefreshToken = createOpaqueToken(48);
  const session = await client.authSession.create({ data: { userId: user.id, refreshTokenHash: hashOpaqueToken(refreshToken), familyId: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } });
  const other = await client.authSession.create({ data: { userId: user.id, refreshTokenHash: hashOpaqueToken(otherRefreshToken), familyId: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } });
  return { user, session, other, refreshToken, otherRefreshToken };
}
function httpApp(repository) {
  const app = express(); app.set('trust proxy', 1); app.use(express.json());
  app.use('/auth', createAuthRouter({ service: createAuthService({ repository }), allowedOrigins: ['https://settings.example.test'], authenticateMiddleware: createAuthenticate({ verifyToken: verifyAccessToken, findActiveSession: repository.findActiveSession.bind(repository) }) }));
  app.use(errorHandler); return app;
}
integration('account locks, families and revocation with PostgreSQL', () => {
  afterAll(async () => { await client.user.deleteMany({ where: { id: { in: ids } } }); await client.$disconnect(); });
  it('rejects an old password proof after a competing password change', async () => {
    const { user, session } = await fixture(), repository = createAuthRepository(client);
    const input = { userId: user.id, sessionId: session.id, expectedPasswordHash: 'old-hash', newPasswordHash: 'new-hash', now: new Date() };
    const results = await Promise.all([repository.changePasswordAndRevokeSessions(input), repository.changePasswordAndRevokeSessions({ ...input, newPasswordHash: 'other-hash' })]);
    expect(results.filter(r => r.status === 'CHANGED')).toHaveLength(1);
    expect(await client.authSession.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
  });
  it('revokes a refreshed successor without logging out another device family', async () => {
    const { user, session, other } = await fixture(), repository = createAuthRepository(client), now = new Date();
    const rotated = await repository.rotateSession({ refreshTokenHash: session.refreshTokenHash, now, replacement: { refreshTokenHash: randomUUID(), familyId: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } });
    expect(rotated.status).toBe('ROTATED');
    await repository.revokeSession(session.refreshTokenHash, now, { ownerId: user.id, anchorSessionId: session.id });
    expect(await repository.findActiveSession(rotated.session.id, user.id)).toBeNull();
    expect(await repository.findActiveSession(other.id, user.id)).not.toBeNull();
  });
  it('rejects a new cookie login of the SAME user in another family', async () => {
    const { user, session, other } = await fixture(), repository = createAuthRepository(client);
    await expect(repository.revokeSession(other.refreshTokenHash, new Date(), { ownerId: user.id, anchorSessionId: session.id })).rejects.toMatchObject({ code: 'SETTINGS_SESSION_CHANGED' });
    expect(await repository.findActiveSession(other.id, user.id)).not.toBeNull();
    expect(await repository.findActiveSession(session.id, user.id)).not.toBeNull();
  });
  it('cannot issue a login using an obsolete verified hash', async () => {
    const { user } = await fixture(), repository = createAuthRepository(client);
    await client.user.update({ where: { id: user.id }, data: { passwordHash: 'new-hash' } });
    const created = await repository.createSession({ userId: user.id, expectedPasswordHash: 'old-hash', session: { refreshTokenHash: randomUUID(), familyId: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } });
    expect(created).toBeNull();
  });
  it('accepts a rotated successor of the authenticated bearer family for global logout', async () => {
    const { user, session } = await fixture(), repository = createAuthRepository(client), now = new Date();
    const rotated = await repository.rotateSession({ refreshTokenHash: session.refreshTokenHash, now, replacement: { refreshTokenHash: randomUUID(), familyId: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } });
    await repository.revokeAllSessions(user.id, now, { sessionId: session.id, correlation: { ownerId: user.id, anchorSessionId: session.id, cookieHash: rotated.session.refreshTokenHash } });
    expect(await client.authSession.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
  });
  it('serializes password change against reset and invalidates the outstanding code', async () => {
    const { user, session } = await fixture(), repository = createAuthRepository(client), now = new Date(), codeHash = randomUUID();
    const code = await client.authCode.create({ data: { userId: user.id, type: 'PASSWORD_RESET', codeHash, expiresAt: new Date(Date.now() + 3600000) } });
    const results = await Promise.all([
      repository.changePasswordAndRevokeSessions({ userId: user.id, sessionId: session.id, expectedPasswordHash: 'old-hash', newPasswordHash: 'changed-hash', now }),
      repository.resetPasswordWithCode({ email: user.email, codeHash, passwordHash: 'reset-hash', now, maxAttempts: 5 })
    ]);
    expect(results.filter(r => ['CHANGED', 'RESET'].includes(r.status))).toHaveLength(1);
    expect((await client.authCode.findUnique({ where: { id: code.id } })).consumedAt).not.toBeNull();
    expect(await client.authSession.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
  });
  it('does not create a surviving successor when refresh races with password change', async () => {
    const { user, session } = await fixture(), repository = createAuthRepository(client), now = new Date();
    await Promise.all([
      repository.rotateSession({ refreshTokenHash: session.refreshTokenHash, now, replacement: { refreshTokenHash: randomUUID(), familyId: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } }),
      repository.changePasswordAndRevokeSessions({ userId: user.id, sessionId: session.id, expectedPasswordHash: 'old-hash', newPasswordHash: 'changed-hash', now })
    ]);
    expect(await client.authSession.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
  });
  it('rolls back the password when a subsequent database step fails', async () => {
    const { user, session } = await fixture();
    const failingClient = { $transaction: callback => client.$transaction(tx => callback(new Proxy(tx, { get(target, property) {
      if (property === 'authCode') return { updateMany: async () => { throw Error('fixture DB failure'); } };
      return Reflect.get(target, property);
    } }))) };
    const repository = createAuthRepository(failingClient);
    await expect(repository.changePasswordAndRevokeSessions({ userId: user.id, sessionId: session.id, expectedPasswordHash: 'old-hash', newPasswordHash: 'changed-hash', now: new Date() })).rejects.toThrow('fixture DB failure');
    expect((await client.user.findUnique({ where: { id: user.id } })).passwordHash).toBe('old-hash');
    expect(await client.authSession.count({ where: { userId: user.id, revokedAt: null } })).toBe(2);
  });
  it('does not refresh a pending registration after verification wins the race', async () => {
    const { user } = await fixture(), now = new Date(), codeHash = randomUUID();
    await client.user.update({ where: { id: user.id }, data: { isActive: false, emailVerifiedAt: null, cpfHash: randomUUID(), pendingRegistrationExpiresAt: new Date(Date.now() + 3600000) } });
    await client.authCode.create({ data: { userId: user.id, type: 'EMAIL_VERIFY', codeHash, expiresAt: new Date(Date.now() + 3600000) } });
    let release, started;
    const gate = new Promise(resolve => { release = resolve; }), read = new Promise(resolve => { started = resolve; });
    const paused = { $transaction: callback => client.$transaction(tx => callback(new Proxy(tx, { get(target, property) {
      if (property === 'user') return new Proxy(target.user, { get(model, method) {
        if (method === 'findMany') return async args => { const rows = await model.findMany(args); started(); await gate; return rows; };
        return Reflect.get(model, method);
      } });
      return Reflect.get(target, property);
    } }))) };
    const replacement = createAuthRepository(paused).upsertPendingAccount({ user: { email: user.email, cpfHash: 'another-cpf', passwordHash: 'unverified-replacement', pendingRegistrationExpiresAt: new Date(Date.now() + 3600000) }, code: { codeHash: randomUUID(), expiresAt: new Date(Date.now() + 3600000) }, now });
    await read;
    try {
      const verified = await createAuthRepository(client).verifyEmailAndCreateSession({ email: user.email, codeHash, now, maxAttempts: 5, session: { refreshTokenHash: randomUUID(), familyId: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } });
      expect(verified.status).toBe('VERIFIED');
    } finally { release(); }
    expect((await replacement).status).toBe('CONFLICT');
    expect((await client.user.findUnique({ where: { id: user.id } })).passwordHash).toBe('old-hash');
  });
  it('preserves another same-user cookie family on409 without Set-Cookie', async () => {
    const { user, session, other, otherRefreshToken } = await fixture(), repository = createAuthRepository(client);
    const response = await request(httpApp(repository)).post('/auth/browser/logout').set('Origin', 'https://settings.example.test').set('X-Forwarded-Proto', 'https').set('X-Settings-Owner', user.id).set('X-Settings-Session', session.id).set('Cookie', `__Host-trocalivros_refresh=${otherRefreshToken}`);
    expect(response.status).toBe(409); expect(response.headers['set-cookie']).toBeUndefined();
    expect(await repository.findActiveSession(other.id, user.id)).not.toBeNull();
  });
  it('returns403 for current password and clears cookie only after a confirmed successful change', async () => {
    const { user, session, refreshToken } = await fixture(), repository = createAuthRepository(client);
    await client.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword('Senha@123') } });
    const app = httpApp(repository), token = await signAccessToken({ userId: user.id, sessionId: session.id });
    const post = () => request(app).post('/auth/browser/change-password').set('Authorization', 'Bearer ' + token).set('Origin', 'https://settings.example.test').set('X-Forwarded-Proto', 'https').set('X-Settings-Owner', user.id).set('X-Settings-Session', session.id).set('Cookie', `__Host-trocalivros_refresh=${refreshToken}`);
    const wrong = await post().send({ currentPassword: 'Errada@123', newPassword: 'NovaSenha@123' });
    expect(wrong.status).toBe(403); expect(wrong.body.error.code).toBe('CURRENT_PASSWORD_INVALID'); expect(wrong.headers['set-cookie']).toBeUndefined();
    expect(await client.authSession.count({ where: { userId: user.id, revokedAt: null } })).toBe(2);
    const changed = await post().send({ currentPassword: 'Senha@123', newPassword: 'NovaSenha@123' });
    expect(changed.status).toBe(200); expect(changed.body).toEqual({ data: { ok: true } });
    expect(changed.headers['set-cookie'][0]).toContain('__Host-trocalivros_refresh=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
    expect(await client.authSession.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    const oldToken = await request(app).get('/auth/me').set('Authorization', 'Bearer ' + token);
    expect(oldToken.status).toBe(401);
  });
});
