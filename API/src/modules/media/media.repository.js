import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';

const maxImagesPerBook = 3;

function invalidOrder() {
  return new AppError('A lista de fotos não corresponde às fotos atuais do livro.', {
    statusCode: 422,
    code: 'IMAGE_ORDER_INVALID'
  });
}

async function lockOwnedBook(tx, bookId, ownerId) {
  const rows = await tx.$queryRaw`
    SELECT "id" FROM "Book"
    WHERE "id" = ${bookId} AND "user_id" = ${ownerId}
    FOR UPDATE
  `;
  if (!rows.length) {
    throw new AppError('Livro não encontrado ou sem permissão.', {
      statusCode: 404,
      code: 'BOOK_NOT_FOUND'
    });
  }
}

async function moveToTemporaryPositions(tx, images) {
  for (const [index, image] of images.entries()) {
    await tx.bookImage.update({
      where: { id: image.id },
      data: { sortOrder: 100 + index }
    });
  }
}

export const mediaRepository = {
  async enqueueCleanup(storageKey) {
    if (!storageKey) return;
    await prisma.storageCleanupJob.upsert({
      where: { storageKey },
      create: { storageKey },
      update: { nextAttemptAt: new Date() }
    });
  },

  findById(id) {
    return prisma.bookImage.findUnique({ where: { id } });
  },

  complete({ imageId, bookId, ownerId, storageKey, url, mimeType, size }) {
    return prisma.$transaction(async (tx) => {
      await lockOwnedBook(tx, bookId, ownerId);

      const existing = await tx.bookImage.findUnique({ where: { id: imageId } });
      if (existing) {
        if (existing.bookId === bookId && existing.storageKey === storageKey) return existing;
        throw new AppError('Esse envio já foi associado a outra imagem.', {
          statusCode: 409,
          code: 'IMAGE_UPLOAD_MISMATCH'
        });
      }

      const count = await tx.bookImage.count({ where: { bookId } });
      if (count >= maxImagesPerBook) {
        throw new AppError('Este livro já atingiu o limite de três fotos.', {
          statusCode: 409,
          code: 'IMAGE_LIMIT_REACHED'
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
          sortOrder: count,
          isCover: count === 0
        }
      });
    });
  },

  async reorder({ ownerId, bookId, imageIds }) {
    return prisma.$transaction(async (tx) => {
      await lockOwnedBook(tx, bookId, ownerId);
      const current = await tx.bookImage.findMany({
        where: { bookId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
      });
      const currentIds = new Set(current.map((image) => image.id));

      if (
        imageIds.length !== current.length
        || imageIds.some((imageId) => !currentIds.has(imageId))
      ) {
        throw invalidOrder();
      }

      const imageById = new Map(current.map((image) => [image.id, image]));
      await moveToTemporaryPositions(tx, imageIds.map((imageId) => imageById.get(imageId)));

      for (const [sortOrder, imageId] of imageIds.entries()) {
        await tx.bookImage.update({
          where: { id: imageId },
          data: { sortOrder, isCover: sortOrder === 0 }
        });
      }

      return tx.bookImage.findMany({
        where: { bookId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
      });
    });
  },

  async remove({ ownerId, bookId, imageId }) {
    return prisma.$transaction(async (tx) => {
      await lockOwnedBook(tx, bookId, ownerId);
      const image = await tx.bookImage.findFirst({ where: { id: imageId, bookId } });
      if (!image) return null;

      if (image.storageKey) {
        await tx.storageCleanupJob.upsert({
          where: { storageKey: image.storageKey },
          create: { storageKey: image.storageKey },
          update: { nextAttemptAt: new Date() }
        });
      }

      await tx.bookImage.delete({ where: { id: imageId } });
      const remaining = await tx.bookImage.findMany({
        where: { bookId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
      });
      await moveToTemporaryPositions(tx, remaining);
      for (const [sortOrder, remainingImage] of remaining.entries()) {
        await tx.bookImage.update({
          where: { id: remainingImage.id },
          data: { sortOrder, isCover: sortOrder === 0 }
        });
      }
      return { ...image, cleanupPending: Boolean(image.storageKey) };
    });
  }
};
