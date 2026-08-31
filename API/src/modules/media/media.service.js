import { randomUUID } from 'node:crypto';
import { AppError } from '../../shared/errors/AppError.js';
import { booksRepository } from '../books/books.repository.js';
import { mediaRepository } from './media.repository.js';
import { completeUploadSchema, presignSchema } from './media.schemas.js';
import { storageService } from './storage.service.js';

function assertStorageKey(storageKey, ownerId, bookId, imageId) {
  const segments = storageKey.split('/');
  const [scope, keyOwnerId, keyBookId, filename] = segments;
  const exactImage = filename?.match(/^([0-9a-f-]{36})\.(jpg|png|webp)$/i)?.[1];
  if (
    segments.length !== 4
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
    assertStorageKey(data.storageKey, ownerId, bookId, data.imageId);
    await storageService.assertUploaded(data.storageKey, data);

    try {
      return await mediaRepository.create({
        ...data,
        bookId,
        url: storageService.getPublicUrl(data.storageKey)
      });
    } catch (error) {
      try {
        await storageService.delete(data.storageKey);
      } catch {
        // O lifecycle do bucket é a segunda camada para objetos não vinculados.
      }
      throw error;
    }
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

    await storageService.delete(image.storageKey);
    await mediaRepository.delete(imageId);
  }
};
