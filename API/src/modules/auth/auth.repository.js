import { prisma } from '../../shared/database/prisma.js';
import { authUserSelect } from '../users/users.repository.js';
import { finalAvatarKey, ownedLegacyAvatarKey } from '../media/avatar.keys.js';
import { settingsSessionChanged } from './auth.actor.js';

async function lockAccount(tx, userId) {
  const rows = await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  return rows.length ? tx.user.findUnique({ where: { id: userId }, select: authUserSelect }) : null;
}
async function revokeMatching(tx, where, now) {
  const sessions = await tx.authSession.findMany({ where: { ...where, revokedAt: null }, select: { id: true } });
  await tx.authSession.updateMany({ where: { ...where, revokedAt: null }, data: { revokedAt: now } });
  return sessions.map(session => session.id);
}
async function bindCorrelation(tx, current, correlation) {
  if (!correlation) return;
  if (!current || current.userId !== correlation.ownerId) throw settingsSessionChanged();
  const anchor = await tx.authSession.findUnique({ where: { id: correlation.anchorSessionId } });
  if (!anchor || anchor.userId !== current.userId || anchor.familyId !== current.familyId) throw settingsSessionChanged();
  if (correlation.cookieHash) {
    const cookie = await tx.authSession.findUnique({ where: { refreshTokenHash: correlation.cookieHash } });
    if (!cookie || cookie.userId !== current.userId || cookie.familyId !== current.familyId) throw settingsSessionChanged();
  }
}
async function liveFamilySession(tx, userId, sessionId, now) {
  const captured = await tx.authSession.findUnique({ where: { id: sessionId } });
  if (!captured || captured.userId !== userId) return null;
  if (!captured.revokedAt && captured.expiresAt > now) return captured;
  if (!captured.replacedById) return null;
  return tx.authSession.findFirst({ where: { userId, familyId: captured.familyId, revokedAt: null, expiresAt: { gt: now } } });
}

const codeSelect = {
  id: true,
  codeHash: true,
  expiresAt: true,
  consumedAt: true,
  attempts: true,
  lastSentAt: true,
  createdAt: true
};

const registrationCandidateSelect = {
  id: true,
  email: true,
  cpfHash: true,
  emailVerifiedAt: true,
  isActive: true,
  pendingRegistrationExpiresAt: true
};

async function enqueueBookImageCleanup(tx, userIds) {
  if (!userIds.length) return;
  const images = await tx.bookImage.findMany({
    where: { book: { ownerId: { in: userIds } }, storageKey: { not: null } },
    select: { storageKey: true }
  });
  const users = await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, avatarStorageKey: true, avatarVersion: true, avatarUrl: true } });
  const grants = await tx.avatarUpload.findMany({ where: { userId: { in: userIds } } });
  const keys = [...images.map((image) => image.storageKey),
    ...users.flatMap((user) => [user.avatarStorageKey, ownedLegacyAvatarKey(user)]),
    ...grants.flatMap((grant) => [grant.storageKey, finalAvatarKey(grant.userId, grant.id)])].filter(Boolean);
  for (const storageKey of new Set(keys)) {
    await tx.storageCleanupJob.upsert({
      where: { storageKey },
      create: { storageKey },
      update: { nextAttemptAt: new Date() }
    });
  }
}

const latestCode = (client, userId, type) => client.authCode.findFirst({
  where: { userId, type },
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  select: codeSelect
});

const evaluateCode = async (client, { userId, type, codeHash, now, maxAttempts }) => {
  const code = await latestCode(client, userId, type);

  if (!code) return { status: 'INVALID_CODE' };
  if (code.consumedAt) return { status: 'CONSUMED' };
  if (code.attempts >= maxAttempts) return { status: 'ATTEMPTS_EXCEEDED' };
  if (code.expiresAt <= now) return { status: 'EXPIRED' };

  if (code.codeHash !== codeHash) {
    await client.authCode.updateMany({
      where: {
        id: code.id,
        consumedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: maxAttempts }
      },
      data: { attempts: { increment: 1 } }
    });
    return { status: 'INVALID_CODE' };
  }

  const consumed = await client.authCode.updateMany({
    where: {
      id: code.id,
      codeHash,
      consumedAt: null,
      expiresAt: { gt: now },
      attempts: { lt: maxAttempts }
    },
    data: { consumedAt: now }
  });

  return consumed.count === 1 ? { status: 'VALID' } : { status: 'INVALID_CODE' };
};

export function createAuthRepository(database = prisma) { return {
  findActiveSession(sessionId, userId, now = new Date()) {
    return database.authSession.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
        user: { is: { isActive: true, emailVerifiedAt: { not: null } } }
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerifiedAt: true,
            phone: true,
            interests: true,
            isActive: true,
            avatarStorageKey: true, avatarVersion: true, avatarUrl: true,
            bio: true,
            city: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });
  },
  async sessionRetirementReason(sessionId, userId) {
    const retired = await database.authSession.findFirst({ where: { id: sessionId, userId }, select: { familyId: true, replacedById: true } });
    if (!retired?.replacedById) return 'terminal';
    const active = await database.authSession.findFirst({ where: { familyId: retired.familyId, userId, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
    return active ? 'rotated' : 'terminal';
  },

  deleteExpiredPendingAccounts(now) {
    return database.$transaction(async (tx) => {
      const where = {
        email: { not: null },
        passwordHash: { not: null },
        emailVerifiedAt: null,
        isActive: false,
        pendingRegistrationExpiresAt: { lte: now }
      };
      const users = await tx.user.findMany({ where, select: { id: true } });
      const expiredIds = [];
      for (const candidate of users.sort((a, b) => a.id.localeCompare(b.id))) {
        await lockAccount(tx, candidate.id);
        if (await tx.user.findFirst({ where: { ...where, id: candidate.id }, select: { id: true } })) expiredIds.push(candidate.id);
      }
      await enqueueBookImageCleanup(tx, expiredIds);
      return tx.user.deleteMany({ where: { ...where, id: { in: expiredIds } } });
    });
  },

  upsertPendingAccount({ user, code, now }) {
    return database.$transaction(async (client) => {
      let candidates = await client.user.findMany({
        where: { OR: [{ email: user.email }, { cpfHash: user.cpfHash }] },
        select: registrationCandidateSelect
      });
      for (const candidate of [...candidates].sort((a, b) => a.id.localeCompare(b.id))) await lockAccount(client, candidate.id);
      if (candidates.length) candidates = await client.user.findMany({
        where: { OR: [{ email: user.email }, { cpfHash: user.cpfHash }] }, select: registrationCandidateSelect
      });
      const pendingByEmail = candidates.find((candidate) => (
        candidate.email === user.email
        && !candidate.emailVerifiedAt
        && !candidate.isActive
      ));
      const cpfOwner = candidates.find((candidate) => candidate.cpfHash === user.cpfHash);
      const canRefreshPending = pendingByEmail
        && (!cpfOwner || cpfOwner.id === pendingByEmail.id);

      if (canRefreshPending && (!pendingByEmail.pendingRegistrationExpiresAt || pendingByEmail.pendingRegistrationExpiresAt > now)) {
        await client.authCode.updateMany({
          where: { userId: pendingByEmail.id, type: 'EMAIL_VERIFY', consumedAt: null },
          data: { consumedAt: now }
        });
        const updated = await client.user.update({
          where: { id: pendingByEmail.id },
          data: {
            passwordHash: user.passwordHash,
            cpfHash: user.cpfHash,
            cpfEncrypted: user.cpfEncrypted,
            phone: user.phone,
            pendingRegistrationExpiresAt: user.pendingRegistrationExpiresAt
          },
          select: authUserSelect
        });
        await client.authCode.create({ data: { userId: updated.id, type: 'EMAIL_VERIFY', ...code } });
        return { status: 'REFRESHED', user: updated };
      }

      if (pendingByEmail && canRefreshPending) {
        await enqueueBookImageCleanup(client, [pendingByEmail.id]);
        await client.user.delete({ where: { id: pendingByEmail.id } });
      }

      if (candidates.length > 0) return { status: 'CONFLICT' };

      const created = await client.user.create({ data: user, select: authUserSelect });
      await client.authCode.create({ data: { userId: created.id, type: 'EMAIL_VERIFY', ...code } });
      return { status: 'CREATED', user: created };
    });
  },

  findUserByEmailForAuth(email) {
    return database.user.findUnique({ where: { email }, select: authUserSelect });
  },
  findUserByIdForAuth(id) {
    return database.user.findUnique({ where: { id }, select: authUserSelect });
  },
  checkCorrelation(userId, sessionId, correlation) {
    return database.$transaction(async tx => {
      const user = await lockAccount(tx, userId);
      const current = user ? await liveFamilySession(tx, userId, sessionId, new Date()) : null;
      if (!current) throw settingsSessionChanged();
      await bindCorrelation(tx, current, correlation);
    });
  },

  replaceAuthCode({ userId, type, code, now, cooldownMs }) {
    return database.$transaction(async (client) => {
      if (!await lockAccount(client, userId)) return { status: 'INVALID_CODE' };
      const previous = await latestCode(client, userId, type);
      if (previous && cooldownMs > 0 && now.getTime() - previous.lastSentAt.getTime() < cooldownMs) {
        return { status: 'COOLDOWN' };
      }

      await client.authCode.updateMany({
        where: { userId, type, consumedAt: null },
        data: { consumedAt: now }
      });
      await client.authCode.create({ data: { userId, type, ...code } });
      return { status: 'CREATED' };
    });
  },

  verifyEmailAndCreateSession({ email, codeHash, now, maxAttempts, session }) {
    return database.$transaction(async (client) => {
      const user = await client.user.findUnique({ where: { email }, select: authUserSelect });
      if (!user) return { status: 'INVALID_CODE' };
      if (!await lockAccount(client, user.id)) return { status: 'INVALID_CODE' };

      const evaluated = await evaluateCode(client, { userId: user.id, type: 'EMAIL_VERIFY', codeHash, now, maxAttempts });
      if (evaluated.status !== 'VALID') return evaluated;

      const activated = await client.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: now, isActive: true, pendingRegistrationExpiresAt: null },
        select: authUserSelect
      });
      const createdSession = await client.authSession.create({ data: { userId: user.id, ...session } });
      return { status: 'VERIFIED', user: activated, session: createdSession };
    });
  },

  createSession({ userId, session, expectedPasswordHash, rehashedPasswordHash }) {
    return database.$transaction(async (tx) => {
      const user = await lockAccount(tx, userId);
      if (!user?.isActive || !user.emailVerifiedAt || (expectedPasswordHash !== undefined && user.passwordHash !== expectedPasswordHash)) return null;
      if (rehashedPasswordHash) await tx.user.update({ where: { id: userId }, data: { passwordHash: rehashedPasswordHash } });
      return tx.authSession.create({ data: { userId, ...session } });
    });
  },

  updatePasswordHash(userId, passwordHash) {
    return database.user.update({ where: { id: userId }, data: { passwordHash }, select: authUserSelect });
  },
  rebindSession({ refreshTokenHash, now, correlation }) {
    return database.$transaction(async tx => {
      const lookup = await tx.authSession.findUnique({ where: { refreshTokenHash }, select: { userId: true } });
      if (!lookup || !await lockAccount(tx, lookup.userId)) return { status: 'INVALID' };
      const current = await tx.authSession.findUnique({ where: { refreshTokenHash }, include: { user: { select: authUserSelect } } });
      if (!current || current.revokedAt || current.expiresAt <= now || !current.user.isActive || !current.user.emailVerifiedAt) return { status: 'INVALID' };
      await bindCorrelation(tx, current, correlation);
      return { status: 'ACTIVE', user: current.user, session: current };
    });
  },

  rotateSession({ refreshTokenHash, now, replacement, correlation }) {
    return database.$transaction(async (client) => {
      const lookup = await client.authSession.findUnique({ where: { refreshTokenHash }, select: { userId: true } });
      if (!lookup || !await lockAccount(client, lookup.userId)) return { status: 'INVALID' };
      const current = await client.authSession.findUnique({
        where: { refreshTokenHash },
        include: { user: { select: authUserSelect } }
      });

      if (!current) return { status: 'INVALID' };
      await bindCorrelation(client, current, correlation);
      if (current.revokedAt) {
        const sessionIds = await revokeMatching(client, { userId: current.userId, familyId: current.familyId }, now);
        return { status: 'REPLAYED', userId: current.userId, sessionIds };
      }
      if (current.expiresAt <= now) {
        await client.authSession.updateMany({
          where: { id: current.id, revokedAt: null },
          data: { revokedAt: now }
        });
        return { status: 'EXPIRED', userId: current.userId, sessionIds: [current.id] };
      }
      if (!current.user.isActive || !current.user.emailVerifiedAt) return { status: 'INVALID' };

      const created = await client.authSession.create({
        data: { userId: current.userId, ...replacement, familyId: current.familyId }
      });
      const revoked = await client.authSession.updateMany({
        where: { id: current.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now, replacedById: created.id, lastUsedAt: now }
      });

      if (revoked.count !== 1) {
        await client.authSession.updateMany({
          where: { familyId: current.familyId, revokedAt: null },
          data: { revokedAt: now }
        });
        return { status: 'REPLAYED' };
      }

      return { status: 'ROTATED', user: current.user, session: created, retiredSessionIds: [current.id] };
    });
  },

  revokeSession(refreshTokenHash, now, correlation) {
    return database.$transaction(async (tx) => {
      const lookup = await tx.authSession.findUnique({ where: { refreshTokenHash } });
      if (!lookup) { if (correlation) throw settingsSessionChanged(); return { sessionIds: [] }; }
      if (!await lockAccount(tx, lookup.userId)) { if (correlation) throw settingsSessionChanged(); return { sessionIds: [] }; }
      const current = await tx.authSession.findUnique({ where: { id: lookup.id } });
      await bindCorrelation(tx, current, correlation);
      const sessionIds = await revokeMatching(tx, { userId: current.userId, familyId: current.familyId }, now);
      return { userId: current.userId, sessionIds };
    });
  },

  revokeAllSessions(userId, now, { sessionId, correlation } = {}) {
    return database.$transaction(async (tx) => {
      const user = await lockAccount(tx, userId);
      if (!user) throw settingsSessionChanged();
      if (sessionId) {
        const current = await liveFamilySession(tx, userId, sessionId, now);
        if (!current) throw settingsSessionChanged();
        await bindCorrelation(tx, current, correlation);
      } else if (correlation) throw settingsSessionChanged();
      return { userId, sessionIds: await revokeMatching(tx, { userId }, now) };
    });
  },

  changePasswordAndRevokeSessions({ userId, sessionId, expectedPasswordHash, newPasswordHash, now = new Date(), correlation }) {
    return database.$transaction(async (tx) => {
      const user = await lockAccount(tx, userId);
      const current = user ? await liveFamilySession(tx, userId, sessionId, now) : null;
      if (!user?.isActive || !user.emailVerifiedAt || !current || user.passwordHash !== expectedPasswordHash) return { status: 'CHANGED_SESSION' };
      await bindCorrelation(tx, current, correlation);
      await tx.user.update({ where: { id: userId }, data: { passwordHash: newPasswordHash } });
      await tx.authCode.updateMany({ where: { userId, type: 'PASSWORD_RESET', consumedAt: null }, data: { consumedAt: now } });
      return { status: 'CHANGED', userId, sessionIds: await revokeMatching(tx, { userId }, now) };
    });
  },

  resetPasswordWithCode({ email, codeHash, passwordHash, now, maxAttempts }) {
    return database.$transaction(async (client) => {
      let user = await client.user.findUnique({ where: { email }, select: authUserSelect });
      if (!user) return { status: 'INVALID_CODE' };
      user = await lockAccount(client, user.id);
      if (!user) return { status: 'INVALID_CODE' };

      const evaluated = await evaluateCode(client, { userId: user.id, type: 'PASSWORD_RESET', codeHash, now, maxAttempts });
      if (evaluated.status !== 'VALID') return evaluated;

      const updated = await client.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          emailVerifiedAt: user.emailVerifiedAt ?? now,
          isActive: true
        },
        select: authUserSelect
      });
      const sessionIds = await revokeMatching(client, { userId: user.id }, now);
      await client.authCode.updateMany({ where: { userId: user.id, type: 'PASSWORD_RESET', consumedAt: null }, data: { consumedAt: now } });
      return { status: 'RESET', user: updated, userId: user.id, sessionIds };
    });
  }
}; }
export const authRepository = createAuthRepository();
