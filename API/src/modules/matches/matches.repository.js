import { prisma } from '../../shared/database/prisma.js';

const matchInclude = {
  userA: {
    select: { id: true, name: true, avatarUrl: true, city: true }
  },
  userB: {
    select: { id: true, name: true, avatarUrl: true, city: true }
  },
  conversation: {
    select: { id: true, updatedAt: true }
  }
};

export const matchesRepository = {
  upsertInteraction({ actorId, targetBookId, action, clientActionId }) {
    return prisma.interaction.upsert({
      where: { actorId_targetBookId: { actorId, targetBookId } },
      create: { actorId, targetBookId, action, clientActionId },
      update: { action, clientActionId }
    });
  },

  findReverseLike(actorId, targetOwnerId) {
    return prisma.interaction.findFirst({
      where: {
        actorId: targetOwnerId,
        action: 'LIKE',
        targetBook: { ownerId: actorId }
      },
      include: { targetBook: true }
    });
  },

  async createMatch(userOneId, userTwoId) {
    const [userAId, userBId] = [userOneId, userTwoId].sort();

    return prisma.$transaction(async (tx) => {
      const match = await tx.match.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        create: { userAId, userBId },
        update: { status: 'ACTIVE' }
      });

      await tx.conversation.upsert({
        where: { matchId: match.id },
        create: {
          matchId: match.id,
          members: {
            create: [{ userId: userAId }, { userId: userBId }]
          }
        },
        update: {}
      });

      return tx.match.findUnique({ where: { id: match.id }, include: matchInclude });
    });
  },

  listForUser(userId) {
    return prisma.match.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ userAId: userId }, { userBId: userId }]
      },
      include: matchInclude,
      orderBy: { updatedAt: 'desc' }
    });
  }
};
