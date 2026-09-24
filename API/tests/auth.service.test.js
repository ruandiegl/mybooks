import bcrypt from 'bcryptjs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { hashOpaqueToken, hashPassword, needsPasswordRehash, verifyAccessToken, verifyPassword } from '../src/modules/auth/auth.crypto.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';

const START = new Date('2026-09-11T12:00:00.000Z');
const EMAIL = 'leitora@example.com';
const CPF = '529.982.247-25';
const PHONE = '(11) 91234-5678';
const PASSWORD = 'Senha@123';
const NEW_PASSWORD = 'NovaSenha@456';
const DAY_MS = 24 * 60 * 60 * 1000;

class FakeClock {
  constructor(value = START) {
    this.value = new Date(value);
  }

  now = () => new Date(this.value);

  advance(milliseconds) {
    this.value = new Date(this.value.getTime() + milliseconds);
  }
}

class FakeEmailService {
  verification = [];
  welcome = [];
  passwordReset = [];
  failWelcome = false;
  failVerification = false;
  failPasswordReset = false;

  async sendVerification(message) {
    if (this.failVerification) throw new Error('provider unavailable');
    this.verification.push(message);
  }

  async sendWelcome(message) {
    if (this.failWelcome) throw new Error('provider unavailable');
    this.welcome.push(message);
  }

  async sendPasswordReset(message) {
    if (this.failPasswordReset) throw new Error('provider unavailable');
    this.passwordReset.push(message);
  }
}

class FakeAuthRepository {
  users = [];
  codes = [];
  sessions = [];
  raceOnCreate = false;
  nextId = 1;

  id(prefix) {
    return `${prefix}-${this.nextId++}`;
  }

  async deleteExpiredPendingAccounts(now) {
    const expired = this.users.filter((user) => (
      !user.emailVerifiedAt
      && !user.isActive
      && user.pendingRegistrationExpiresAt
      && user.pendingRegistrationExpiresAt <= now
    ));
    const expiredIds = new Set(expired.map((user) => user.id));
    this.users = this.users.filter((user) => !expiredIds.has(user.id));
    this.codes = this.codes.filter((code) => !expiredIds.has(code.userId));
    this.sessions = this.sessions.filter((session) => !expiredIds.has(session.userId));
  }

  async upsertPendingAccount({ user, code, now }) {
    if (this.raceOnCreate) {
      const error = new Error('Unique constraint');
      error.code = 'P2002';
      throw error;
    }

    const candidates = this.users.filter((candidate) => candidate.email === user.email || candidate.cpfHash === user.cpfHash);
    const pendingByEmail = candidates.find((candidate) => (
      candidate.email === user.email
      && !candidate.emailVerifiedAt
      && !candidate.isActive
    ));
    const cpfOwner = candidates.find((candidate) => candidate.cpfHash === user.cpfHash);
    const canRefreshPending = pendingByEmail
      && (!cpfOwner || cpfOwner.id === pendingByEmail.id);

    if (canRefreshPending && (!pendingByEmail.pendingRegistrationExpiresAt || pendingByEmail.pendingRegistrationExpiresAt > now)) {
      Object.assign(pendingByEmail, {
        passwordHash: user.passwordHash,
        cpfHash: user.cpfHash,
        cpfEncrypted: user.cpfEncrypted,
        phone: user.phone,
        pendingRegistrationExpiresAt: user.pendingRegistrationExpiresAt,
        updatedAt: now
      });
      for (const current of this.codes) {
        if (current.userId === pendingByEmail.id && current.type === 'EMAIL_VERIFY' && !current.consumedAt) current.consumedAt = now;
      }
      this.codes.push({ id: this.id('code'), userId: pendingByEmail.id, type: 'EMAIL_VERIFY', ...code });
      return { status: 'REFRESHED', user: pendingByEmail };
    }

    if (pendingByEmail && canRefreshPending) {
      this.users = this.users.filter((candidate) => candidate.id !== pendingByEmail.id);
      this.codes = this.codes.filter((current) => current.userId !== pendingByEmail.id);
    }

    if (candidates.length > 0) return { status: 'CONFLICT' };

    const created = { id: this.id('user'), createdAt: code.createdAt, updatedAt: code.createdAt, ...user };
    this.users.push(created);
    this.codes.push({ id: this.id('code'), userId: created.id, type: 'EMAIL_VERIFY', ...code });
    return { status: 'CREATED', user: created };
  }

  async findUserByEmailForAuth(email) {
    return this.users.find((user) => user.email === email) ?? null;
  }

  latestCode(userId, type) {
    return this.codes.filter((code) => code.userId === userId && code.type === type).at(-1) ?? null;
  }

  async replaceAuthCode({ userId, type, code, now, cooldownMs }) {
    const latest = this.latestCode(userId, type);

    if (latest && cooldownMs > 0 && now.getTime() - latest.lastSentAt.getTime() < cooldownMs) {
      return { status: 'COOLDOWN' };
    }

    for (const current of this.codes) {
      if (current.userId === userId && current.type === type && !current.consumedAt) current.consumedAt = now;
    }
    this.codes.push({ id: this.id('code'), userId, type, ...code });
    return { status: 'CREATED' };
  }

  evaluateCode({ user, type, codeHash, now, maxAttempts }) {
    const code = this.latestCode(user.id, type);

    if (!code) return { status: 'INVALID_CODE' };
    if (code.consumedAt) return { status: 'CONSUMED' };
    if (code.attempts >= maxAttempts) return { status: 'ATTEMPTS_EXCEEDED' };
    if (code.expiresAt <= now) return { status: 'EXPIRED' };
    if (code.codeHash !== codeHash) {
      code.attempts += 1;
      return { status: 'INVALID_CODE' };
    }

    return { status: 'VALID', code };
  }

  createStoredSession(userId, data) {
    const session = { id: this.id('session'), userId, revokedAt: null, replacedById: null, ...data };
    this.sessions.push(session);
    return session;
  }

  async verifyEmailAndCreateSession({ email, codeHash, now, maxAttempts, session }) {
    const user = await this.findUserByEmailForAuth(email);
    if (!user) return { status: 'INVALID_CODE' };

    const evaluated = this.evaluateCode({ user, type: 'EMAIL_VERIFY', codeHash, now, maxAttempts });
    if (evaluated.status !== 'VALID') return evaluated;

    evaluated.code.consumedAt = now;
    user.emailVerifiedAt = now;
    user.isActive = true;
    user.updatedAt = now;
    return { status: 'VERIFIED', user, session: this.createStoredSession(user.id, session) };
  }

  async createSession({ userId, session }) {
    return this.createStoredSession(userId, session);
  }

  async updatePasswordHash(userId, passwordHash) {
    const user = this.users.find((candidate) => candidate.id === userId);
    user.passwordHash = passwordHash;
  }

  async rotateSession({ refreshTokenHash, now, replacement }) {
    const current = this.sessions.find((session) => session.refreshTokenHash === refreshTokenHash);
    if (!current) return { status: 'INVALID' };

    if (current.revokedAt) {
      for (const session of this.sessions) {
        if (session.familyId === current.familyId && !session.revokedAt) session.revokedAt = now;
      }
      return { status: 'REPLAYED' };
    }

    if (current.expiresAt <= now) {
      current.revokedAt = now;
      return { status: 'EXPIRED' };
    }

    const user = this.users.find((candidate) => candidate.id === current.userId);
    if (!user?.isActive || !user.emailVerifiedAt) return { status: 'INVALID' };

    const next = this.createStoredSession(current.userId, { ...replacement, familyId: current.familyId });
    current.revokedAt = now;
    current.replacedById = next.id;
    current.lastUsedAt = now;
    return { status: 'ROTATED', user, session: next };
  }

  async revokeSession(refreshTokenHash, now) {
    const session = this.sessions.find((candidate) => candidate.refreshTokenHash === refreshTokenHash);
    if (session && !session.revokedAt) session.revokedAt = now;
  }

  async revokeAllSessions(userId, now) {
    for (const session of this.sessions) {
      if (session.userId === userId && !session.revokedAt) session.revokedAt = now;
    }
  }

  async resetPasswordWithCode({ email, codeHash, passwordHash, now, maxAttempts }) {
    const user = await this.findUserByEmailForAuth(email);
    if (!user) return { status: 'INVALID_CODE' };

    const evaluated = this.evaluateCode({ user, type: 'PASSWORD_RESET', codeHash, now, maxAttempts });
    if (evaluated.status !== 'VALID') return evaluated;

    evaluated.code.consumedAt = now;
    user.passwordHash = passwordHash;
    user.emailVerifiedAt ??= now;
    user.isActive = true;
    user.updatedAt = now;
    await this.revokeAllSessions(user.id, now);
    return { status: 'RESET', user };
  }
}

let currentPasswordHash;
let oldPasswordHash;

beforeAll(async () => {
  currentPasswordHash = await hashPassword(PASSWORD);
  oldPasswordHash = await bcrypt.hash(PASSWORD, 10);
});

describe('authService', () => {
  let repository;
  let emailService;
  let clock;
  let service;

  beforeEach(() => {
    repository = new FakeAuthRepository();
    emailService = new FakeEmailService();
    clock = new FakeClock();
    service = createAuthService({ repository, emailService, clock, logger: { warn() {} } });
  });

  const seedUser = (overrides = {}) => {
    const user = {
      id: repository.id('user'),
      clerkUserId: null,
      name: 'Leitor TrocaLivros',
      email: EMAIL,
      passwordHash: currentPasswordHash,
      legacyPassHash: null,
      emailVerifiedAt: START,
      firstName: null,
      lastName: null,
      cpfHash: 'cpf-hash-secret',
      cpfEncrypted: 'cpf-encrypted-secret',
      phone: '+5511912345678',
      interests: [],
      profileCompletedAt: null,
      booksOnboardingCompletedAt: null,
      isActive: true,
      pendingRegistrationExpiresAt: null,
      avatarUrl: null,
      bio: null,
      city: null,
      createdAt: START,
      updatedAt: START,
      ...overrides
    };
    repository.users.push(user);
    return user;
  };

  const addCode = (user, type, code, overrides = {}) => {
    const stored = {
      id: repository.id('code'),
      userId: user.id,
      type,
      codeHash: hashOpaqueToken(code),
      expiresAt: new Date(START.getTime() + 15 * 60 * 1000),
      consumedAt: null,
      attempts: 0,
      lastSentAt: START,
      createdAt: START,
      ...overrides
    };
    repository.codes.push(stored);
    return stored;
  };

  const addSession = (user, token, overrides = {}) => repository.createStoredSession(user.id, {
    refreshTokenHash: hashOpaqueToken(token),
    familyId: 'family-existing',
    expiresAt: new Date(START.getTime() + 30 * DAY_MS),
    userAgent: null,
    ipHash: null,
    createdAt: START,
    lastUsedAt: START,
    ...overrides
  });

  it('registers a pending account with protected credentials and emails a six-digit code', async () => {
    const result = await service.register({ email: ` ${EMAIL.toUpperCase()} `, password: PASSWORD, cpf: CPF, phone: PHONE }, {
      userAgent: 'mobile-app',
      ip: '203.0.113.7'
    });

    expect(result).toEqual({ userId: 'user-1', email: EMAIL, requiresEmailVerification: true });
    expect(repository.users[0]).toMatchObject({
      name: 'Leitor TrocaLivros',
      email: EMAIL,
      phone: '+5511912345678',
      isActive: false,
      emailVerifiedAt: null,
      pendingRegistrationExpiresAt: new Date(START.getTime() + DAY_MS)
    });
    expect(repository.users[0].passwordHash).not.toBe(PASSWORD);
    await expect(verifyPassword(PASSWORD, repository.users[0].passwordHash)).resolves.toBe(true);
    expect(repository.users[0].cpfHash).toMatch(/^[a-f0-9]{64}$/);
    expect(repository.users[0].cpfEncrypted).not.toContain('52998224725');
    expect(repository.codes[0]).toMatchObject({ type: 'EMAIL_VERIFY', attempts: 0, consumedAt: null });
    expect(repository.codes[0].expiresAt).toEqual(new Date(START.getTime() + 15 * 60 * 1000));
    expect(repository.codes[0].lastSentAt).toEqual(START);
    expect(emailService.verification).toHaveLength(1);
    expect(emailService.verification[0]).toMatchObject({ to: EMAIL, ttlMinutes: 15 });
    expect(emailService.verification[0].code).toMatch(/^\d{6}$/);
    expect(repository.codes[0].codeHash).toBe(hashOpaqueToken(emailService.verification[0].code));
    expect(JSON.stringify(result)).not.toContain(emailService.verification[0].code);
    expect(repository.codes[0]).not.toHaveProperty('code');
  });

  it('keeps a pending registration recoverable when email delivery fails', async () => {
    emailService.failVerification = true;
    await expect(service.register({ email: EMAIL, password: PASSWORD, cpf: CPF, phone: PHONE }))
      .resolves.toMatchObject({ requiresEmailVerification: true });
    expect(repository.users).toHaveLength(1);
    expect(repository.codes).toHaveLength(1);
  });

  it('retries the same pending registration instead of creating a duplicate conflict', async () => {
    const first = await service.register({ email: EMAIL, password: PASSWORD, cpf: CPF, phone: PHONE });

    const retry = await service.register({ email: EMAIL, password: NEW_PASSWORD, cpf: CPF, phone: PHONE });

    expect(retry).toEqual({ userId: first.userId, email: EMAIL, requiresEmailVerification: true });
    expect(repository.users).toHaveLength(1);
    expect(repository.users[0].id).toBe(first.userId);
    expect(repository.codes).toHaveLength(2);
    expect(repository.codes[0].consumedAt).toEqual(START);
    expect(emailService.verification).toHaveLength(2);
    await expect(verifyPassword(NEW_PASSWORD, repository.users[0].passwordHash)).resolves.toBe(true);
  });

  it('retries a pending registration with the same email without a cooldown', async () => {
    const first = await service.register({ email: EMAIL, password: PASSWORD, cpf: CPF, phone: PHONE });
    const previousCpfHash = repository.users[0].cpfHash;

    const retry = await service.register({
      email: EMAIL,
      password: NEW_PASSWORD,
      cpf: '390.533.447-05',
      phone: '(21) 98888-7777'
    });

    expect(retry).toEqual({ userId: first.userId, email: EMAIL, requiresEmailVerification: true });
    expect(repository.users).toHaveLength(1);
    expect(repository.users[0].id).toBe(first.userId);
    expect(repository.users[0].cpfHash).not.toBe(previousCpfHash);
    expect(repository.users[0].phone).toBe('+5521988887777');
    expect(repository.codes).toHaveLength(2);
    expect(repository.codes[0].consumedAt).toEqual(START);
    expect(emailService.verification).toHaveLength(2);
    await expect(verifyPassword(NEW_PASSWORD, repository.users[0].passwordHash)).resolves.toBe(true);
  });

  it('keeps a CPF conflict when another pending account owns the replacement CPF', async () => {
    await service.register({ email: EMAIL, password: PASSWORD, cpf: CPF, phone: PHONE });
    await service.register({ email: 'outra@example.com', password: PASSWORD, cpf: '390.533.447-05', phone: PHONE });

    await expect(service.register({ email: EMAIL, password: NEW_PASSWORD, cpf: '390.533.447-05', phone: PHONE })).rejects.toMatchObject({
      code: 'ACCOUNT_ALREADY_EXISTS',
      statusCode: 409
    });
  });

  it('replaces an expired pending registration on the next attempt', async () => {
    const first = await service.register({ email: EMAIL, password: PASSWORD, cpf: CPF, phone: PHONE });

    clock.advance(DAY_MS + 1);
    const retry = await service.register({ email: EMAIL, password: NEW_PASSWORD, cpf: CPF, phone: PHONE });

    expect(retry.userId).not.toBe(first.userId);
    expect(repository.users).toHaveLength(1);
    expect(repository.users[0].id).toBe(retry.userId);
    expect(repository.codes).toHaveLength(1);
    expect(repository.codes[0].consumedAt).toBeNull();
  });

  it('returns the same generic conflict for a verified duplicate email', async () => {
    await service.register({ email: EMAIL, password: PASSWORD, cpf: CPF, phone: PHONE });
    await service.verifyEmail({ email: EMAIL, code: emailService.verification[0].code });

    await expect(service.register({ email: EMAIL, password: PASSWORD, cpf: '390.533.447-05', phone: PHONE })).rejects.toMatchObject({
      code: 'ACCOUNT_ALREADY_EXISTS',
      statusCode: 409
    });
  });

  it('returns the same generic conflict for a duplicate CPF', async () => {
    await service.register({ email: EMAIL, password: PASSWORD, cpf: CPF, phone: PHONE });

    await expect(service.register({ email: 'outra@example.com', password: PASSWORD, cpf: CPF, phone: PHONE })).rejects.toMatchObject({
      code: 'ACCOUNT_ALREADY_EXISTS',
      statusCode: 409
    });
  });

  it('maps a Prisma P2002 registration race to the generic account conflict', async () => {
    repository.raceOnCreate = true;

    await expect(service.register({ email: EMAIL, password: PASSWORD, cpf: CPF, phone: PHONE })).rejects.toMatchObject({
      code: 'ACCOUNT_ALREADY_EXISTS',
      statusCode: 409
    });
  });

  it('verifies an email once, activates the user, creates a session and sends one idempotent welcome', async () => {
    const user = seedUser({ isActive: false, emailVerifiedAt: null });
    addCode(user, 'EMAIL_VERIFY', '123456');

    const result = await service.verifyEmail({ email: EMAIL, code: '123456' }, { userAgent: 'x'.repeat(300), ip: '198.51.100.20' });

    expect(user).toMatchObject({ isActive: true, emailVerifiedAt: START });
    expect(result.user.emailVerifiedAt).toEqual(START);
    expect(repository.codes[0].consumedAt).toEqual(START);
    expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(result.expiresAt).toEqual(new Date(START.getTime() + 15 * 60 * 1000));
    await expect(verifyAccessToken(result.accessToken)).resolves.toMatchObject({ userId: user.id, sessionId: repository.sessions[0].id });
    expect(repository.sessions[0].refreshTokenHash).toBe(hashOpaqueToken(result.refreshToken));
    expect(repository.sessions[0].familyId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(repository.sessions[0].expiresAt).toEqual(new Date(START.getTime() + 30 * DAY_MS));
    expect(repository.sessions[0].userAgent).toHaveLength(255);
    expect(repository.sessions[0].ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(repository.sessions[0].ipHash).not.toBe('198.51.100.20');
    expect(emailService.welcome).toEqual([{ to: EMAIL, name: 'Leitor TrocaLivros', idempotencyKey: `welcome:${user.id}` }]);

    await expect(service.verifyEmail({ email: EMAIL, code: '123456' })).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_CODE' });
    expect(emailService.welcome).toHaveLength(1);
  });

  it('returns the authenticated session when the welcome email provider fails', async () => {
    const user = seedUser({ isActive: false, emailVerifiedAt: null });
    addCode(user, 'EMAIL_VERIFY', '123456');
    emailService.failWelcome = true;

    const result = await service.verifyEmail({ email: EMAIL, code: '123456' });

    expect(result).toMatchObject({ accessToken: expect.any(String), refreshToken: expect.any(String) });
    expect(user).toMatchObject({ isActive: true, emailVerifiedAt: START });
    expect(repository.sessions).toHaveLength(1);
  });

  it.each([
    ['incorrect', '654321', {}],
    ['expired', '123456', { expiresAt: new Date(START.getTime() - 1) }],
    ['consumed', '123456', { consumedAt: START }]
  ])('rejects an %s verification code without creating a session', async (_case, submitted, codeOverrides) => {
    const user = seedUser({ isActive: false, emailVerifiedAt: null });
    const code = addCode(user, 'EMAIL_VERIFY', '123456', codeOverrides);

    await expect(service.verifyEmail({ email: EMAIL, code: submitted })).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_CODE' });
    expect(repository.sessions).toHaveLength(0);
    expect(user.isActive).toBe(false);
    if (_case === 'incorrect') expect(code.attempts).toBe(1);
  });

  it('locks a verification code after five atomic incorrect attempts', async () => {
    const user = seedUser({ isActive: false, emailVerifiedAt: null });
    const code = addCode(user, 'EMAIL_VERIFY', '123456');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(service.verifyEmail({ email: EMAIL, code: '000000' })).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_CODE' });
    }
    expect(code.attempts).toBe(5);
    await expect(service.verifyEmail({ email: EMAIL, code: '123456' })).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_CODE' });
    expect(repository.sessions).toHaveLength(0);
  });

  it('enforces the 60-second verification resend cooldown without revealing account state', async () => {
    const user = seedUser({ isActive: false, emailVerifiedAt: null });
    addCode(user, 'EMAIL_VERIFY', '123456');

    await expect(service.resendVerification({ email: EMAIL })).resolves.toEqual({ accepted: true });
    expect(emailService.verification).toHaveLength(0);

    clock.advance(60_000);
    await expect(service.resendVerification({ email: EMAIL })).resolves.toEqual({ accepted: true });
    expect(emailService.verification).toHaveLength(1);
    expect(repository.codes).toHaveLength(2);
    expect(repository.codes[0].consumedAt).toEqual(clock.now());

    await expect(service.resendVerification({ email: 'ausente@example.com' })).resolves.toEqual({ accepted: true });
  });

  it('keeps resend and password recovery generic when the email provider fails', async () => {
    const user = seedUser({ isActive: false, emailVerifiedAt: null });
    addCode(user, 'EMAIL_VERIFY', '123456', { lastSentAt: new Date(START.getTime() - 61_000) });
    emailService.failVerification = true;
    emailService.failPasswordReset = true;

    await expect(service.resendVerification({ email: EMAIL })).resolves.toEqual({ accepted: true });
    await expect(service.requestPasswordReset({ email: EMAIL })).resolves.toEqual({ accepted: true });
  });

  it('uses the same generic error and equivalent bcrypt work for missing users and wrong passwords', async () => {
    seedUser();
    const wrongPassword = 'x';
    await service.login({ email: EMAIL, password: wrongPassword }).catch(() => {});

    const startedWrong = performance.now();
    const wrong = await service.login({ email: EMAIL, password: wrongPassword }).catch((error) => error);
    const wrongDuration = performance.now() - startedWrong;
    const startedMissing = performance.now();
    const missing = await service.login({ email: 'ausente@example.com', password: wrongPassword }).catch((error) => error);
    const missingDuration = performance.now() - startedMissing;

    expect({ code: wrong.code, message: wrong.message }).toEqual({ code: missing.code, message: missing.message });
    expect(wrong).toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
    expect(Math.min(wrongDuration, missingDuration)).toBeGreaterThan(50);
    expect(Math.max(wrongDuration, missingDuration) / Math.min(wrongDuration, missingDuration)).toBeLessThan(3);
  });

  it('rejects a correct password while the email is not verified', async () => {
    seedUser({ isActive: false, emailVerifiedAt: null });

    await expect(service.login({ email: EMAIL, password: PASSWORD })).rejects.toMatchObject({
      code: 'EMAIL_NOT_VERIFIED',
      statusCode: 403
    });
    expect(repository.sessions).toHaveLength(0);
  });

  it('rehashes an old bcrypt password after successful login and returns a safe DTO', async () => {
    const user = seedUser({ passwordHash: oldPasswordHash, password: 'raw-secret', sessions: ['secret'] });

    const result = await service.login({ email: EMAIL, password: PASSWORD }, { userAgent: 'app', ip: '192.0.2.10' });

    expect(needsPasswordRehash(user.passwordHash)).toBe(false);
    await expect(verifyPassword(PASSWORD, user.passwordHash)).resolves.toBe(true);
    expect(result).toMatchObject({ refreshToken: expect.any(String), accessToken: expect.any(String), expiresAt: expect.any(Date) });
    expect(result.user).toMatchObject({ id: user.id, name: user.name, email: EMAIL, isActive: true });
    for (const secret of ['passwordHash', 'legacyPassHash', 'cpfHash', 'cpfEncrypted', 'password', 'sessions', 'authSessions', 'authCodes']) {
      expect(result.user).not.toHaveProperty(secret);
    }
  });

  it('rotates refresh tokens in the same family and marks the previous session replaced', async () => {
    const user = seedUser();
    const login = await service.login({ email: EMAIL, password: PASSWORD });
    const previous = repository.sessions[0];

    clock.advance(1000);
    const rotated = await service.refresh(login.refreshToken, { userAgent: 'new-client', ip: '203.0.113.99' });
    const current = repository.sessions[1];

    expect(rotated.refreshToken).not.toBe(login.refreshToken);
    expect(current.familyId).toBe(previous.familyId);
    expect(previous).toMatchObject({ revokedAt: clock.now(), replacedById: current.id, lastUsedAt: clock.now() });
    expect(current.refreshTokenHash).toBe(hashOpaqueToken(rotated.refreshToken));
    await expect(verifyAccessToken(rotated.accessToken)).resolves.toMatchObject({ userId: user.id, sessionId: current.id });
  });

  it('revokes a whole refresh family when a replaced token is replayed', async () => {
    seedUser();
    const login = await service.login({ email: EMAIL, password: PASSWORD });
    await service.refresh(login.refreshToken);

    clock.advance(1000);
    await expect(service.refresh(login.refreshToken)).rejects.toMatchObject({ code: 'SESSION_REPLAYED', statusCode: 401 });
    expect(repository.sessions.every((session) => session.revokedAt)).toBe(true);
  });

  it('treats any revoked refresh token as replay and revokes its whole family', async () => {
    const user = seedUser();
    const replayedToken = 'revoked-refresh-token-that-is-long-enough';
    addSession(user, replayedToken, { revokedAt: START });
    const activeSibling = addSession(user, 'active-sibling-refresh-token-long-enough');

    clock.advance(1000);
    await expect(service.refresh(replayedToken)).rejects.toMatchObject({ code: 'SESSION_REPLAYED', statusCode: 401 });
    expect(activeSibling.revokedAt).toEqual(clock.now());
  });

  it.each([
    ['unknown', 'unknown-refresh-token-that-is-long-enough', null],
    ['expired', 'expired-refresh-token-that-is-long-enough', { expiresAt: new Date(START.getTime() - 1) }]
  ])('does not issue tokens for an %s refresh session', async (_case, token, overrides) => {
    const user = seedUser();
    if (overrides) addSession(user, token, overrides);

    await expect(service.refresh(token)).rejects.toMatchObject({ code: 'INVALID_SESSION', statusCode: 401 });
    expect(repository.sessions.filter((session) => !session.revokedAt)).toHaveLength(0);
  });

  it('logs out one refresh session idempotently and can log out all active user sessions', async () => {
    const user = seedUser();
    const first = addSession(user, 'first-refresh-token-that-is-long-enough');
    const second = addSession(user, 'second-refresh-token-that-is-long-enough', { familyId: 'family-2' });

    await expect(service.logout({ refreshToken: 'first-refresh-token-that-is-long-enough' })).resolves.toEqual({ ok: true });
    await expect(service.logout({ refreshToken: 'first-refresh-token-that-is-long-enough' })).resolves.toEqual({ ok: true });
    expect(first.revokedAt).toEqual(START);
    expect(second.revokedAt).toBeNull();

    await expect(service.logoutAll(user.id)).resolves.toEqual({ ok: true });
    expect(second.revokedAt).toEqual(START);
  });

  it('always accepts password-reset requests and only emails existing accounts', async () => {
    const user = seedUser();

    await expect(service.requestPasswordReset({ email: 'ausente@example.com' })).resolves.toEqual({ accepted: true });
    expect(emailService.passwordReset).toHaveLength(0);
    expect(repository.codes).toHaveLength(0);

    await expect(service.requestPasswordReset({ email: EMAIL })).resolves.toEqual({ accepted: true });
    expect(emailService.passwordReset).toHaveLength(1);
    expect(emailService.passwordReset[0]).toMatchObject({ to: EMAIL, ttlMinutes: 15 });
    expect(emailService.passwordReset[0].code).toMatch(/^\d{6}$/);
    expect(repository.latestCode(user.id, 'PASSWORD_RESET').codeHash).toBe(hashOpaqueToken(emailService.passwordReset[0].code));
  });

  it('resets a password once and revokes every active session', async () => {
    const user = seedUser();
    const code = addCode(user, 'PASSWORD_RESET', '123456');
    addSession(user, 'first-refresh-token-that-is-long-enough');
    addSession(user, 'second-refresh-token-that-is-long-enough', { familyId: 'family-2' });

    await expect(service.resetPassword({ email: EMAIL, code: '123456', password: NEW_PASSWORD })).resolves.toEqual({ ok: true });
    await expect(verifyPassword(NEW_PASSWORD, user.passwordHash)).resolves.toBe(true);
    expect(code.consumedAt).toEqual(START);
    expect(repository.sessions.every((session) => session.revokedAt?.getTime() === START.getTime())).toBe(true);

    await expect(service.resetPassword({ email: EMAIL, code: '123456', password: PASSWORD })).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_CODE'
    });
  });

  it('activates and verifies a legacy inactive account after a valid reset code', async () => {
    const user = seedUser({ passwordHash: oldPasswordHash, emailVerifiedAt: null, isActive: false });
    addCode(user, 'PASSWORD_RESET', '123456');

    await service.resetPassword({ email: EMAIL, code: '123456', password: NEW_PASSWORD });

    expect(user.isActive).toBe(true);
    expect(user.emailVerifiedAt).toEqual(START);
  });

  it('applies expiration, consumption and attempt limits to password-reset codes', async () => {
    const user = seedUser();
    const code = addCode(user, 'PASSWORD_RESET', '123456');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(service.resetPassword({ email: EMAIL, code: '000000', password: NEW_PASSWORD })).rejects.toMatchObject({
        code: 'INVALID_OR_EXPIRED_CODE'
      });
    }
    expect(code.attempts).toBe(5);
    await expect(service.resetPassword({ email: EMAIL, code: '123456', password: NEW_PASSWORD })).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_CODE'
    });

    const expired = addCode(user, 'PASSWORD_RESET', '654321', { expiresAt: new Date(START.getTime() - 1) });
    await expect(service.resetPassword({ email: EMAIL, code: '654321', password: NEW_PASSWORD })).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_CODE'
    });
    expired.consumedAt = START;
    await expect(service.resetPassword({ email: EMAIL, code: '654321', password: NEW_PASSWORD })).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_CODE'
    });
  });
});
