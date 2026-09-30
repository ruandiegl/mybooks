import { prisma } from '../../shared/database/prisma.js';

export const likesRepository = {
  findReceivedLikes(userId, { cursor, limit, sort, bookId }) {
    const where = {
      action: 'LIKE',
      targetBook: {
        ownerId: userId
      },
      ...(bookId && { targetBookId: bookId })
    };

    return prisma.interaction.findMany({
      where,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: {
        createdAt: sort
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
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
        action: 'LIKE'
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
              select: { id: true, name: true, avatarUrl: true, city: true }
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
            action: 'LIKE'
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
