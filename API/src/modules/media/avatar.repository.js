import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { finalAvatarKey, ownedLegacyAvatarKey } from './avatar.keys.js';
const select = { id: true, avatarUrl: true, avatarStorageKey: true, avatarVersion: true };
const failure = (code, statusCode) => new AppError('O envio da foto precisa ser tentado novamente.', { code, statusCode });
export async function enqueueAvatarCleanup(tx, keys) {
  for (const storageKey of new Set(keys.filter(Boolean))) await tx.storageCleanupJob.upsert({ where: { storageKey }, create: { storageKey }, update: { nextAttemptAt: new Date() } });
}
async function lockUser(tx, id) {
  const rows = await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
  if (!rows.length) throw failure('USER_NOT_FOUND', 404);
  return tx.user.findUnique({ where: { id }, select });
}
export function createAvatarRepository(client = prisma) {
  const repository = {
    createGrant(userId, data) {
      return client.$transaction(async (tx) => {
        const user = await lockUser(tx, userId);
        return tx.avatarUpload.create({ data: { ...data, userId, expectedAvatarVersion: user.avatarVersion } });
      });
    },
    async claim(userId, id, now) {
      return client.$transaction(async (tx) => {
        const user = await lockUser(tx, userId);
        const grant = await tx.avatarUpload.findFirst({ where: { id, userId } });
        if (!grant) throw failure('AVATAR_KEY_FORBIDDEN', 403);
        if (grant.status === 'COMMITTED') {
          if (user.avatarVersion === grant.resultVersion && user.avatarStorageKey === finalAvatarKey(userId, id)) return { alreadyCommitted: true, user };
          throw failure('AVATAR_UPLOAD_SUPERSEDED', 409);
        }
        if (grant.status === 'PROCESSING' && now - grant.processingStartedAt < 60_000) throw failure('AVATAR_UPLOAD_IN_PROGRESS', 409);
        if (grant.status !== 'PENDING' || grant.expiresAt <= now) throw failure('AVATAR_UPLOAD_EXPIRED', 410);
        if (grant.expectedAvatarVersion !== user.avatarVersion) throw failure('AVATAR_UPLOAD_SUPERSEDED', 409);
        return { grant: await tx.avatarUpload.update({ where: { id }, data: { status: 'PROCESSING', processingStartedAt: now } }) };
      });
    },
    commit(userId, grant, now) {
      return client.$transaction(async (tx) => {
        const user = await lockUser(tx, userId);
        const current = await tx.avatarUpload.findFirst({ where: { id: grant.id, userId } });
        if (current?.status !== 'PROCESSING' || now - current.processingStartedAt >= 60_000) throw failure('AVATAR_UPLOAD_EXPIRED', 410);
        if (user.avatarVersion !== current.expectedAvatarVersion) throw failure('AVATAR_UPLOAD_SUPERSEDED', 409);
        const updated = await tx.user.update({ where: { id: userId }, data: { avatarStorageKey: finalAvatarKey(userId, grant.id), avatarUrl: null, avatarVersion: { increment: 1 } }, select });
        await tx.avatarUpload.update({ where: { id: grant.id }, data: { status: 'COMMITTED', resultVersion: updated.avatarVersion } });
        await enqueueAvatarCleanup(tx, [user.avatarStorageKey, ownedLegacyAvatarKey(user), current.storageKey]);
        return updated;
      });
    },
    expire(userId, id) {
      return client.$transaction(async (tx) => {
        await lockUser(tx, userId);
        const grant = await tx.avatarUpload.findFirst({ where: { id, userId, status: { in: ['PENDING','PROCESSING','CANCELED','EXPIRED'] } } });
        if (!grant) return;
        await tx.avatarUpload.update({ where: { id }, data: { status: 'EXPIRED' } });
        await enqueueAvatarCleanup(tx, [grant.storageKey, finalAvatarKey(userId, id)]);
      });
    },
    remove(userId) {
      return client.$transaction(async (tx) => {
        const user = await lockUser(tx, userId);
        const grants = await tx.avatarUpload.findMany({ where: { userId, status: { in: ['PENDING','PROCESSING'] } } });
        await enqueueAvatarCleanup(tx, [user.avatarStorageKey, ownedLegacyAvatarKey(user), ...grants.flatMap((g) => [g.storageKey, finalAvatarKey(userId, g.id)])]);
        await tx.avatarUpload.updateMany({ where: { userId, status: { in: ['PENDING','PROCESSING'] } }, data: { status: 'CANCELED' } });
        if (!user.avatarStorageKey && !user.avatarUrl && !grants.length) return user;
        return tx.user.update({ where: { id: userId }, data: { avatarStorageKey: null, avatarUrl: null, avatarVersion: { increment: 1 } }, select });
      });
    },
    async sweepExpired(now = new Date()) {
      const grants = await client.avatarUpload.findMany({ where: { OR: [
        { status: 'PENDING', expiresAt: { lte: now } },
        { status: 'PROCESSING', processingStartedAt: { lte: new Date(now - 60_000) } }
      ] }, orderBy: { createdAt: 'asc' }, take: 20 });
      for (const g of grants) await repository.expire(g.userId, g.id);
      await client.avatarUpload.deleteMany({ where: { status: { in: ['COMMITTED','CANCELED','EXPIRED'] }, updatedAt: { lt: new Date(now - 86_400_000) } } });
      return grants.length;
    }
  };
  return repository;
}
export const avatarRepository = createAvatarRepository();
