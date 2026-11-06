import { createHash } from 'node:crypto';
import { prisma } from '../../shared/database/prisma.js';
import { visibleUserFilter } from '../moderation/moderation.visibility.js';

const includeBook = {
  images: {
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
  },
  owner: {
    select: {
      id: true,
      name: true,
      avatarStorageKey: true, avatarVersion: true, avatarUrl: true,
      city: true
    }
  }
};

function discoveryKey(viewerId, kind, id) {
  return createHash('sha256').update(`${viewerId}:${kind}:${id}`).digest('hex');
}

function interleaveDiscoveryBooks(rows, viewerId) {
  const byOwner = new Map();
  const keys = new Map();
  const key = (kind, id) => {
    const token = `${kind}:${id}`;
    if (!keys.has(token)) keys.set(token, discoveryKey(viewerId, kind, id));
    return keys.get(token);
  };
  for (const row of rows) {
    const owner = row.ownerId ?? row.id;
    if (!byOwner.has(owner)) byOwner.set(owner, []);
    byOwner.get(owner).push(row);
  }
  const owners = [...byOwner.keys()].sort((a, b) => key('owner', a).localeCompare(key('owner', b)));
  for (const [owner, books] of byOwner) {
    books.sort((a, b) => key('book', a.id).localeCompare(key('book', b.id)));
  }
  const ordered = [];
  for (let round = 0; ordered.length < rows.length; round++) {
    for (const owner of owners) {
      const book = byOwner.get(owner)[round];
      if (book) ordered.push(book);
    }
  }
  return ordered;
}

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
    const availableBooks = {
      ownerId: { not: ownerId },
      availability: 'AVAILABLE',
      owner: visibleUserFilter(ownerId)
    };
    return prisma.$transaction(async tx => {
      // Order all visible IDs before filtering interactions, so a newly passed
      // cursor still has the same position in the next page.
      const candidates = await tx.book.findMany({
        where: availableBooks,
        select: {
          id: true,
          ownerId: true,
          interactions: { where: { actorId: ownerId }, select: { action: true } }
        }
      });
      const ordered = interleaveDiscoveryBooks(candidates, ownerId);
      const cursorIndex = cursor ? ordered.findIndex(book => book.id === cursor) : -1;
      if (cursor && cursorIndex < 0) return [];
      const unseen = ordered.some(book => book.interactions.length === 0);
      const selected = ordered.slice(cursorIndex + 1).filter(book => unseen
        ? book.interactions.length === 0
        : book.interactions.some(interaction => interaction.action === 'PASS')).slice(0, limit + 1);
      if (!selected.length) return [];
      const ids = selected.map(book => book.id);
      const books = await tx.book.findMany({
        where: { ...availableBooks, id: { in: ids } },
        include: includeBook
      });
      const byId = new Map(books.map(book => [book.id, book]));
      return ids.map(id => byId.get(id)).filter(Boolean);
    }, { isolationLevel: 'RepeatableRead' });
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
