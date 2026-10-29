import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { serializeAvatarUser } from '../media/avatar.serializer.js';
import { calculateCheckIn, getSaoPauloDayKey, isStreakActive } from './gamification.service.js';

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
  async recordCheckIn(userId, getCurrentDate = () => new Date()) {
    return prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      if (lockedRows.length === 0) throw userNotFound();

      const today = getSaoPauloDayKey(getCurrentDate());

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

    const { currentUser, rankedUsers } = await prisma.$transaction(async (tx) => {
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
          select: { id: true, name: true, avatarStorageKey: true, avatarVersion: true, avatarUrl: true, currentActiveStreak: true }
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
          select: { id: true, name: true, avatarStorageKey: true, avatarVersion: true, avatarUrl: true, currentActiveStreak: true }
        });
      }

      return {
        currentUser: {
          currentStreak,
          rank: currentUserIsEligible ? greaterUsersCount + 1 : null
        },
        rankedUsers
      };
    }, { isolationLevel: 'RepeatableRead' });

    let rank = 0;
    let previousStreak = null;
    const avatarCache = new Map();
    const entries = await Promise.all(rankedUsers.map(async (entry, index) => {
      if (entry.currentActiveStreak !== previousStreak) rank = index + 1;
      previousStreak = entry.currentActiveStreak;
      const entryRank = rank;
      const avatar = await serializeAvatarUser(entry, avatarCache, false);
      return {
        name: avatar.name,
        avatarUrl: avatar.avatarUrl,
        avatarUrlExpiresAt: avatar.avatarUrlExpiresAt,
        avatarVersion: avatar.avatarVersion,
        currentStreak: entry.currentActiveStreak,
        rank: entryRank
      };
    }));
    return { currentUser, entries };
  }
};
