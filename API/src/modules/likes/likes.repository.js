import { prisma } from '../../shared/database/prisma.js';
import { visibleUserFilter } from '../moderation/moderation.visibility.js';

function actorWithoutActiveMatch(userId) {
  return {
    matchesAsUserA: { none: { userBId: userId, status: 'ACTIVE' } },
    matchesAsUserB: { none: { userAId: userId, status: 'ACTIVE' } }
  };
}

export const likesRepository = {
  async findReceivedLikes(userId, { cursor, limit, sort, bookId }) {
    // Resolve within this reader's books, even if the cursor's actor now has a match.
    const anchor = cursor ? await prisma.interaction.findFirst({
      where: { id: cursor, targetBook: { ownerId: userId } },
      select: { id: true, createdAt: true }
    }) : null;
    if (cursor && !anchor) return [];
    const comparison = sort === 'asc' ? 'gt' : 'lt';
    const where = {
      action: 'LIKE',
      actor: { ...actorWithoutActiveMatch(userId), ...visibleUserFilter(userId) },
      targetBook: {
        ownerId: userId
      },
      ...(bookId && { targetBookId: bookId }),
      ...(anchor && { OR: [
        { createdAt: { [comparison]: anchor.createdAt } },
        { createdAt: anchor.createdAt, id: { [comparison]: anchor.id } }
      ] })
    };

    return prisma.interaction.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: sort }, { id: sort }],
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            avatarStorageKey: true, avatarVersion: true, avatarUrl: true,
            city: true,
            books: {
              where: { availability: 'AVAILABLE' },
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                title: true,
                images: {
                  take: 1,
                  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                  select: {
                    id: true,
                    url: true,
                    storageKey: true,
                    sortOrder: true,
                    isCover: true,
                    createdAt: true
                  }
                }
              }
            }
          }
        },
        targetBook: {
          select: {
            id: true,
            title: true,
            images: {
              take: 1,
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
              select: { id: true, url: true, storageKey: true, sortOrder: true, isCover: true, createdAt: true }
            }
          }
        }
      }
    });
  },

  findSentLikes(userId, { cursor, limit, sort }) {
    return prisma.interaction.findMany({
      where: {
        actorId: userId,
        action: 'LIKE',
        targetBook: { owner: visibleUserFilter(userId) }
      },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: {
        createdAt: sort
      },
      include: {
        targetBook: {
          select: {
            id: true,
            title: true,
            owner: {
              select: { id: true, name: true, avatarStorageKey: true, avatarVersion: true, avatarUrl: true, city: true }
            },
            images: {
              take: 1,
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
              select: { id: true, url: true, storageKey: true, sortOrder: true, isCover: true, createdAt: true }
            }
          }
        }
      }
    });
  },

  async countPendingReceivedLikes(userId) {
    const result = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "Interaction" i
      JOIN "Book" b ON b.id = i."targetBookId"
      WHERE i.action = 'LIKE'
        AND b.user_id = ${userId}
        AND NOT EXISTS (
          SELECT 1 FROM "UserBlock" ub
          WHERE (ub."blockerId" = ${userId} AND ub."blockedId" = i."actorId")
             OR (ub."blockedId" = ${userId} AND ub."blockerId" = i."actorId")
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Match" m
          WHERE m.status = 'ACTIVE'
            AND ((m."userAId" = ${userId} AND m."userBId" = i."actorId")
              OR (m."userBId" = ${userId} AND m."userAId" = i."actorId"))
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Interaction" i2
          JOIN "Book" b2 ON b2.id = i2."targetBookId"
          WHERE i2."actorId" = ${userId}
            AND b2.user_id = i."actorId"
        )
    `;
    return Number(result[0]?.count || 0);
  },

  findUserBooksWithLikes(userId) {
    return prisma.book.findMany({
      where: {
        ownerId: userId,
        interactions: {
          some: {
            action: 'LIKE',
            actor: { ...actorWithoutActiveMatch(userId), ...visibleUserFilter(userId) }
          }
        }
      },
      select: {
        id: true,
        title: true
      },
      orderBy: {
        title: 'asc'
      }
    });
  }
};
