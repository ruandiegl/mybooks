import { prisma } from '../../shared/database/prisma.js';

export const storageCleanupRepository = {
  async isReferenced(storageKey) {
    const [avatar, book] = await Promise.all([
      prisma.user.findFirst({ where: { avatarStorageKey: storageKey }, select: { id: true } }),
      prisma.bookImage.findFirst({ where: { storageKey }, select: { id: true } })
    ]);
    return Boolean(avatar || book);
  },
  listDue(now, limit) {
    return prisma.storageCleanupJob.findMany({
      where: { nextAttemptAt: { lte: now } },
      orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
      take: limit
    });
  },

  delete(storageKey) {
    return prisma.storageCleanupJob.deleteMany({ where: { storageKey } });
  },

  async recordFailure(storageKey, errorCode) {
    const job = await prisma.storageCleanupJob.findUnique({ where: { storageKey } });
    if (!job) return;

    const attempts = job.attempts + 1;
    const delayMs = Math.min(15_000 * (2 ** Math.min(attempts - 1, 10)), 24 * 60 * 60 * 1000);
    await prisma.storageCleanupJob.update({
      where: { storageKey },
      data: {
        attempts,
        nextAttemptAt: new Date(Date.now() + delayMs),
        lastError: typeof errorCode === 'string' ? errorCode.slice(0, 80) : 'STORAGE_DELETE_FAILED'
      }
    });
  }
};
