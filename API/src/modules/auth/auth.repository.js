import { prisma } from '../../shared/database/prisma.js';
import { authUserSelect } from '../users/users.repository.js';
import { finalAvatarKey, ownedLegacyAvatarKey } from '../media/avatar.keys.js';

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
  const users = await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, avatarStorageKey: true, avatarUrl: true } });
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

export const authRepository = {
  findActiveSession(sessionId, userId, now = new Date()) {
    return prisma.authSession.findFirst({
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
            avatarUrl: true,
            bio: true,
            city: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });
  },

  deleteExpiredPendingAccounts(now) {
    return prisma.$transaction(async (tx) => {
      const where = {
        email: { not: null },
        passwordHash: { not: null },
        emailVerifiedAt: null,
        isActive: false,
        pendingRegistrationExpiresAt: { lte: now }
      };
      const users = await tx.user.findMany({ where, select: { id: true } });
      await enqueueBookImageCleanup(tx, users.map((user) => user.id));
      return tx.user.deleteMany({ where });
    });
  },

  upsertPendingAccount({ user, code, now }) {
    return prisma.$transaction(async (client) => {
      const candidates = await client.user.findMany({
        where: { OR: [{ email: user.email }, { cpfHash: user.cpfHash }] },
        select: registrationCandidateSelect
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
    return prisma.user.findUnique({ where: { email }, select: authUserSelect });
  },

  replaceAuthCode({ userId, type, code, now, cooldownMs }) {
    return prisma.$transaction(async (client) => {
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
    return prisma.$transaction(async (client) => {
      const user = await client.user.findUnique({ where: { email }, select: authUserSelect });
      if (!user) return { status: 'INVALID_CODE' };

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

  createSession({ userId, session }) {
    return prisma.authSession.create({ data: { userId, ...session } });
  },

  updatePasswordHash(userId, passwordHash) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash }, select: authUserSelect });
  },

  rotateSession({ refreshTokenHash, now, replacement }) {
    return prisma.$transaction(async (client) => {
      const current = await client.authSession.findUnique({
        where: { refreshTokenHash },
        include: { user: { select: authUserSelect } }
      });

      if (!current) return { status: 'INVALID' };
      if (current.revokedAt) {
        await client.authSession.updateMany({
          where: { familyId: current.familyId, revokedAt: null },
          data: { revokedAt: now }
        });
        return { status: 'REPLAYED' };
      }
      if (current.expiresAt <= now) {
        await client.authSession.updateMany({
          where: { id: current.id, revokedAt: null },
          data: { revokedAt: now }
        });
        return { status: 'EXPIRED' };
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

      return { status: 'ROTATED', user: current.user, session: created };
    });
  },

  revokeSession(refreshTokenHash, now) {
    return prisma.authSession.updateMany({
      where: { refreshTokenHash, revokedAt: null },
      data: { revokedAt: now }
    });
  },

  revokeAllSessions(userId, now) {
    return prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now }
    });
  },

  resetPasswordWithCode({ email, codeHash, passwordHash, now, maxAttempts }) {
    return prisma.$transaction(async (client) => {
      const user = await client.user.findUnique({ where: { email }, select: authUserSelect });
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
      await client.authSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now }
      });
      return { status: 'RESET', user: updated };
    });
  }
};
