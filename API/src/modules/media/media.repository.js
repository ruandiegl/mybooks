import { prisma } from '../../shared/database/prisma.js';

export const mediaRepository = {
  findById(id) {
    return prisma.bookImage.findUnique({ where: { id } });
  },

  async create({ imageId, bookId, storageKey, url, mimeType, size, isCover }) {
    return prisma.$transaction(async (tx) => {
      if (isCover) {
        await tx.bookImage.updateMany({
          where: { bookId },
          data: { isCover: false }
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
          isCover
        }
      });
    });
  },

  delete(id) {
    return prisma.bookImage.delete({ where: { id } });
  }
};
