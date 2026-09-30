import { prisma } from '../../shared/database/prisma.js';
import { env } from '../../config/env.js';

const includeBook = {
  images: {
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
  },
  owner: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      city: true
    }
  }
};

export const booksRepository = {
  async listByOwner(ownerId, { cursor, limit, q, sort, availability }) {
    const normalizedIsbn = q?.replace(/[^0-9X]/gi, '');
    return prisma.book.findMany({
      where: {
        ownerId,
        ...(availability ? { availability } : {}),
        ...(q ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { authors: { has: q } },
            ...(normalizedIsbn ? [{ isbn: { contains: normalizedIsbn } }] : [])
          ]
        } : {})
      },
      include: includeBook,
      orderBy: sort === 'title'
        ? [{ title: 'asc' }, { id: 'asc' }]
        : [{ createdAt: sort === 'oldest' ? 'asc' : 'desc' }, { id: sort === 'oldest' ? 'asc' : 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });
  },

  async listDiscovery(ownerId, { cursor, limit }) {
    const pagination = {
      include: includeBook,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    };
    const availableBooks = {
      ownerId: { not: ownerId },
      availability: 'AVAILABLE'
    };
    const unseen = await prisma.book.findMany({
      where: {
        ...availableBooks,
        interactions: { none: { actorId: ownerId } }
      },
      ...pagination
    });

    if (unseen.length || env.NODE_ENV !== 'development') return unseen;

    return prisma.book.findMany({
      where: {
        ...availableBooks,
        interactions: {
          some: { actorId: ownerId, action: 'PASS' }
        }
      },
      ...pagination
    });
  },

  findById(id) {
    return prisma.book.findUnique({ where: { id }, include: includeBook });
  },

  findOwnedById(id, ownerId) {
    return prisma.book.findFirst({
      where: { id, ownerId },
      include: includeBook
    });
  },

  create(data) {
    return prisma.book.create({ data, include: includeBook });
  },

  update(id, data) {
    return prisma.book.update({ where: { id }, data, include: includeBook });
  },

  delete(id) {
    return prisma.$transaction(async (tx) => {
      const images = await tx.bookImage.findMany({
        where: { bookId: id, storageKey: { not: null } },
        select: { storageKey: true }
      });
      for (const image of images) {
        await tx.storageCleanupJob.upsert({
          where: { storageKey: image.storageKey },
          create: { storageKey: image.storageKey },
          update: { nextAttemptAt: new Date() }
        });
      }
      return tx.book.delete({ where: { id } });
    });
  }
};
