import { prisma } from '../../shared/database/prisma.js';

const includeBook = {
  images: {
    orderBy: [{ isCover: 'desc' }, { createdAt: 'asc' }]
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
    return prisma.book.findMany({
      where: {
        ownerId: { not: ownerId },
        availability: 'AVAILABLE',
        interactions: { none: { actorId: ownerId } }
      },
      include: includeBook,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
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
    return prisma.book.delete({ where: { id } });
  }
};
