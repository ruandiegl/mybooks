import { prisma } from '../../shared/database/prisma.js';

export const mediaRepository = {
  findById(id) {
    return prisma.bookImage.findUnique({ where: { id } });
  },

  async create({ imageId, bookId, storageKey, url, mimeType, size, isCover }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.bookImage.findMany({
        where: { bookId },
        select: { sortOrder: true }
      });
      const nextSortOrder = existing.length
        ? Math.max(...existing.map((image) => image.sortOrder)) + 1
        : 0;

      if (isCover) {
        await tx.bookImage.updateMany({
          where: { bookId },
          data: { isCover: false, sortOrder: { increment: 1 } }
        });
      }

      return tx.bookImage.create({
        data: {
          id: imageId,
          bookId,
          storageKey,
          url,
          mimeType,
          size,
          isCover,
          sortOrder: isCover ? 0 : nextSortOrder
        }
      });
    });
  },

  reorder(bookId, imageIds) {
    return prisma.$transaction(async (tx) => {
      const currentImages = await tx.bookImage.findMany({
        where: { bookId },
        select: { id: true }
      });
      const currentIds = new Set(currentImages.map((image) => image.id));

      if (
        currentImages.length !== imageIds.length
        || imageIds.some((imageId) => !currentIds.has(imageId))
      ) {
        return false;
      }

      for (const [sortOrder, id] of imageIds.entries()) {
        await tx.bookImage.updateMany({
          where: { id, bookId },
          data: { sortOrder, isCover: sortOrder === 0 }
        });
      }

      return true;
    }, { isolationLevel: 'Serializable' });
  },

  delete(id) {
    return prisma.bookImage.delete({ where: { id } });
  }
};
