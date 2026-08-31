import { AppError } from '../../shared/errors/AppError.js';
import { isbnService } from '../isbn/isbn.service.js';
import { storageService } from '../media/storage.service.js';
import { booksRepository } from './books.repository.js';
import {
  bookIdSchema,
  bookListSchema,
  createBookSchema,
  paginationSchema,
  updateBookSchema
} from './books.schemas.js';
import { serializeBook } from './books.serializer.js';

function withPagination(rows, limit) {
  const hasNextPage = rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;
  return {
    items: items.map(serializeBook),
    pageInfo: {
      hasNextPage,
      nextCursor: hasNextPage ? items.at(-1)?.id ?? null : null
    }
  };
}

const recoverableIsbnProviderErrors = new Set([
  'ISBN_NOT_FOUND',
  'ISBN_PROVIDER_RATE_LIMITED',
  'ISBN_PROVIDER_UNAVAILABLE'
]);

async function isbnData(value) {
  if (!value) {
    return {
      isbn: null,
      isbnStatus: 'NONE',
      isbnProvider: null,
      isbnValidatedAt: null,
      coverExternalUrl: null
    };
  }

  const isbn = isbnService.validate(value);
  let provider = 'MANUAL';
  let coverExternalUrl = null;
  try {
    const lookup = await isbnService.lookup(isbn);
    provider = lookup.source;
    coverExternalUrl = lookup.book.coverUrl;
  } catch (error) {
    if (!(error instanceof AppError) || !recoverableIsbnProviderErrors.has(error.code)) throw error;
    // Um provedor indisponível não invalida um ISBN com dígito verificador correto.
  }
  return {
    isbn,
    isbnStatus: 'VALID',
    isbnProvider: provider,
    isbnValidatedAt: new Date(),
    coverExternalUrl
  };
}

export const booksService = {
  async listMine(ownerId, query) {
    const pagination = bookListSchema.parse(query);
    const rows = await booksRepository.listByOwner(ownerId, pagination);
    return withPagination(rows, pagination.limit);
  },

  async discover(ownerId, query) {
    const pagination = paginationSchema.parse(query);
    const rows = await booksRepository.listDiscovery(ownerId, pagination);
    return withPagination(rows, pagination.limit);
  },

  async getById(id, currentUserId) {
    const book = await booksRepository.findById(bookIdSchema.parse(id));
    if (!book) {
      throw new AppError('Livro não encontrado.', {
        statusCode: 404,
        code: 'BOOK_NOT_FOUND'
      });
    }

    if (book.ownerId !== currentUserId && book.availability !== 'AVAILABLE') {
      throw new AppError('Você não tem acesso a este livro.', {
        statusCode: 403,
        code: 'BOOK_FORBIDDEN'
      });
    }

    return serializeBook(book);
  },

  async create(ownerId, input) {
    const data = createBookSchema.parse(input);
    const isbn = await isbnData(data.isbn);

    const book = await booksRepository.create({
      ...data,
      ...isbn,
      ownerId
    });
    return serializeBook(book);
  },

  async update(ownerId, id, input) {
    const bookId = bookIdSchema.parse(id);
    const existing = await booksRepository.findOwnedById(bookId, ownerId);
    if (!existing) {
      throw new AppError('Livro não encontrado ou sem permissão.', {
        statusCode: 404,
        code: 'BOOK_NOT_FOUND'
      });
    }

    const data = updateBookSchema.parse(input);
    const isbn = Object.hasOwn(data, 'isbn')
      ? await isbnData(data.isbn)
      : {};

    const book = await booksRepository.update(bookId, { ...data, ...isbn });
    return serializeBook(book);
  },

  async delete(ownerId, id) {
    const bookId = bookIdSchema.parse(id);
    const existing = await booksRepository.findOwnedById(bookId, ownerId);
    if (!existing) {
      throw new AppError('Livro não encontrado ou sem permissão.', {
        statusCode: 404,
        code: 'BOOK_NOT_FOUND'
      });
    }
    await Promise.all(
      (existing.images ?? [])
        .filter((image) => image.storageKey)
        .map((image) => storageService.delete(image.storageKey))
    );
    await booksRepository.delete(bookId);
  }
};
