import { AppError } from '../../shared/errors/AppError.js';
import { fetchBookByIsbn } from './isbn.provider.js';
import { isValidIsbn, normalizeIsbn } from './isbn.utils.js';

function mapProviderBook(book, isbn) {
  return {
    isbn,
    status: 'FOUND',
    source: book.provider || 'BRASIL_API',
    book: {
      title: book.title || '',
      subtitle: book.subtitle || null,
      authors: Array.isArray(book.authors) ? book.authors : [],
      publisher: book.publisher || null,
      synopsis: book.synopsis || null,
      year: Number.isInteger(book.year) ? book.year : null,
      pageCount: Number.isInteger(book.page_count) ? book.page_count : null,
      subjects: Array.isArray(book.subjects) ? book.subjects : [],
      coverUrl: book.cover_url || null
    }
  };
}

export const isbnService = {
  validate(value) {
    const isbn = normalizeIsbn(value);
    if (!isValidIsbn(isbn)) {
      throw new AppError('Informe um ISBN-10 ou ISBN-13 válido.', {
        statusCode: 422,
        code: 'ISBN_INVALID',
        fields: { isbn: 'O dígito verificador do ISBN não é válido.' }
      });
    }
    return isbn;
  },

  async lookup(value) {
    const isbn = this.validate(value);
    const book = await fetchBookByIsbn(isbn);
    return mapProviderBook(book, isbn);
  }
};
