import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { calculateCheckIn, isStreakActive } from './gamification.service.js';

function toDayKey(date) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function toUtcDate(dayKey) {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

function previousDay(dayKey) {
  const date = toUtcDate(dayKey);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function userNotFound() {
  return new AppError('Usuário não encontrado.', { statusCode: 404, code: 'USER_NOT_FOUND' });
}

export const gamificationRepository = {
  async recordCheckIn(userId, today) {
    return prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      if (lockedRows.length === 0) throw userNotFound();

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { lastActiveDay: true, currentActiveStreak: true }
      });
      if (!user) throw userNotFound();

      const result = calculateCheckIn({
        lastActiveDay: toDayKey(user.lastActiveDay),
        currentActiveStreak: user.currentActiveStreak
      }, today);

      await tx.user.update({
        where: { id: userId },
        data: {
          lastActiveDay: toUtcDate(result.lastActiveDay),
          currentActiveStreak: result.currentActiveStreak
        }
      });

      return { dayKey: today, currentStreak: result.currentActiveStreak, checkedInToday: true };
    }, { isolationLevel: 'ReadCommitted' });
  },

  async listLeaderboard({ currentUserId, today }) {
    const todayDate = toUtcDate(today);
    const oldestActiveDate = toUtcDate(previousDay(today));
    const eligibleWhere = {
      lastActiveDay: { gte: oldestActiveDate, lte: todayDate },
      currentActiveStreak: { gt: 0 }
    };

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: currentUserId },
        select: { lastActiveDay: true, currentActiveStreak: true }
      });
      if (!user) throw userNotFound();

      const ownState = {
        lastActiveDay: toDayKey(user.lastActiveDay),
        currentActiveStreak: user.currentActiveStreak
      };
      const currentUserIsEligible = isStreakActive(ownState, today);
      const currentStreak = currentUserIsEligible ? user.currentActiveStreak : 0;

      const [greaterUsersCount, topTwenty] = await Promise.all([
        currentUserIsEligible
          ? tx.user.count({ where: { ...eligibleWhere, currentActiveStreak: { gt: currentStreak } } })
          : Promise.resolve(0),
        tx.user.findMany({
          where: eligibleWhere,
          orderBy: [
            { currentActiveStreak: 'desc' },
            { name: 'asc' },
            { id: 'asc' }
          ],
          take: 20,
          select: { id: true, name: true, avatarUrl: true, currentActiveStreak: true }
        })
      ]);

      let rankedUsers = topTwenty;
      if (topTwenty.length === 20) {
        const cutoffStreak = topTwenty[19].currentActiveStreak;
        rankedUsers = await tx.user.findMany({
          where: { ...eligibleWhere, currentActiveStreak: { gte: cutoffStreak } },
          orderBy: [
            { currentActiveStreak: 'desc' },
            { name: 'asc' },
            { id: 'asc' }
          ],
          select: { id: true, name: true, avatarUrl: true, currentActiveStreak: true }
        });
      }

      return {
        currentUser: {
          currentStreak,
          rank: currentUserIsEligible ? greaterUsersCount + 1 : null
        },
        entries: rankedUsers.map((entry) => ({
          name: entry.name,
          avatarUrl: entry.avatarUrl,
          currentStreak: entry.currentActiveStreak,
          rank: 1 + rankedUsers.filter((candidate) => candidate.currentActiveStreak > entry.currentActiveStreak).length
        }))
      };
    }, { isolationLevel: 'RepeatableRead' });
  }
};
