import { AppError } from '../../shared/errors/AppError.js';
import { prisma } from '../../shared/database/prisma.js';

export const likesQuotaRepository = {
  withUserTransaction(userId, operation) {
    return prisma.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      if (!lockedUsers.length) {
        throw new AppError('Conta não encontrada.', { statusCode: 404, code: 'USER_NOT_FOUND' });
      }
      return operation(tx);
    }, { maxWait: 10000, timeout: 10000 });
  },

  deleteOlderUsage(tx, userId, quotaDate) {
    return tx.likeDailyUsage.deleteMany({
      where: { userId, quotaDate: { lt: quotaDate } }
    });
  },

  findUsage(tx, userId, targetBookId, quotaDate) {
    return tx.likeDailyUsage.findUnique({
      where: {
        userId_targetBookId_quotaDate: { userId, targetBookId, quotaDate }
      }
    });
  },

  countUsage(tx, userId, quotaDate) {
    return tx.likeDailyUsage.count({ where: { userId, quotaDate } });
  },

  createUsage(tx, data) {
    return tx.likeDailyUsage.create({ data });
  }
};
