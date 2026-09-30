import { randomUUID } from 'node:crypto';
import { AppError } from '../../shared/errors/AppError.js';
import { booksRepository } from '../books/books.repository.js';
import { mediaRepository } from './media.repository.js';
import { completeUploadSchema, imageOrderSchema, presignSchema } from './media.schemas.js';
import { storageService } from './storage.service.js';
import { storageCleanupService } from './storageCleanup.service.js';

function assertStorageKey(storageKey, ownerId, bookId, imageId) {
  const segments = storageKey.split('/');
  const isPending = segments[0] === 'pending';
  const [scope, keyOwnerId, keyBookId, filename] = isPending ? segments.slice(1) : segments;
  const exactImage = filename?.match(/^([0-9a-f-]{36})\.(jpg|png|webp)$/i)?.[1];
  if (
    segments.length !== (isPending ? 5 : 4)
    || scope !== 'books'
    || keyOwnerId !== ownerId
    || keyBookId !== bookId
    || exactImage !== imageId
  ) {
    throw new AppError('A chave do upload não pertence a este livro.', {
      statusCode: 403,
      code: 'IMAGE_KEY_FORBIDDEN'
    });
  }
  return { isPending, filename };
}

function imageError(code, message, statusCode) {
  return new AppError(message, { code, statusCode });
}

function serializeImage(image, url, expiresAt = null) {
  return {
    id: image.id,
    url,
    sortOrder: image.sortOrder,
    isCover: image.isCover,
    expiresAt
  };
}

async function requireOwnedBook(bookId, ownerId) {
  const book = await booksRepository.findOwnedById(bookId, ownerId);
  if (!book) {
    throw new AppError('Livro não encontrado ou sem permissão.', {
      statusCode: 404,
      code: 'BOOK_NOT_FOUND'
    });
  }
  return book;
}

export const mediaService = {
  async presign(ownerId, bookId, input) {
    await requireOwnedBook(bookId, ownerId);
    const data = presignSchema.parse(input);
    const imageId = randomUUID();
    const upload = await storageService.createPresignedUpload({
      ownerId,
      bookId,
      imageId,
      ...data
    });
    return { imageId, ...upload };
  },

  async complete(ownerId, bookId, input) {
    await requireOwnedBook(bookId, ownerId);
    const data = completeUploadSchema.parse(input);
    storageService.assertImage(data);
    const key = assertStorageKey(data.storageKey, ownerId, bookId, data.imageId);

    const storageKey = key.isPending
      ? `books/${ownerId}/${bookId}/${key.filename}`
      : data.storageKey;
    const existing = await mediaRepository.findById(data.imageId);
    if (existing) {
      if (existing.bookId !== bookId || existing.storageKey !== storageKey) {
        throw imageError('IMAGE_UPLOAD_MISMATCH', 'Esse envio já foi associado a outra imagem.', 409);
      }
      if (!existing.storageKey) return serializeImage(existing, existing.url ?? null);
      const signed = await storageService.getPresignedGetUrl(existing.storageKey);
      return serializeImage(existing, signed.url, signed.expiresAt);
    }

    await storageService.assertUploaded(data.storageKey, data);

    let image;
    try {
      if (key.isPending) {
        await storageService.copy({ sourceKey: data.storageKey, destinationKey: storageKey });
      }

      image = await mediaRepository.complete({
        ...data,
        bookId,
        ownerId,
        storageKey,
        url: null,
        isCover: false
      });
    } catch (error) {
      if (storageKey !== data.storageKey) {
        try {
          await mediaRepository.enqueueCleanup(storageKey);
          await storageCleanupService.process(storageKey);
        } catch {
          // O lifecycle limpa temporários; a reconciliação cobre objetos finais sem vínculo.
        }
      }
      if (key.isPending) await storageService.delete(data.storageKey).catch(() => undefined);
      throw error;
    }

    if (key.isPending) await storageService.delete(data.storageKey).catch(() => undefined);
    if (!image.storageKey) return serializeImage(image, image.url ?? null);
    const signed = await storageService.getPresignedGetUrl(image.storageKey);
    return serializeImage(image, signed.url, signed.expiresAt);
  },

  async reorder(ownerId, bookId, input) {
    await requireOwnedBook(bookId, ownerId);
    if (Array.isArray(input?.imageIds) && input.imageIds.length > 3) {
      throw imageError('IMAGE_ORDER_INVALID', 'Um livro pode ter até três fotos.', 422);
    }
    const { imageIds } = imageOrderSchema.parse(input);
    if (new Set(imageIds).size !== imageIds.length) {
      throw imageError('IMAGE_ORDER_INVALID', 'A ordem das fotos contém itens repetidos.', 422);
    }

    const images = await mediaRepository.reorder({ ownerId, bookId, imageIds });
    return Promise.all(images.map(async (image) => {
      if (!image.storageKey) return image;
      const signed = await storageService.getPresignedGetUrl(image.storageKey);
      return { ...image, url: signed.url, expiresAt: signed.expiresAt };
    }));
  },

  async delete(ownerId, bookId, imageId) {
    await requireOwnedBook(bookId, ownerId);
    const image = await mediaRepository.findById(imageId);
    if (!image || image.bookId !== bookId) {
      throw new AppError('Imagem não encontrada.', {
        statusCode: 404,
        code: 'IMAGE_NOT_FOUND'
      });
    }

    const removed = await mediaRepository.remove({ ownerId, bookId, imageId });
    if (removed?.storageKey) await storageCleanupService.process(removed.storageKey);
  }
};
