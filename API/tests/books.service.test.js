import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/shared/errors/AppError.js';

const mocks = vi.hoisted(() => ({
  booksRepository: { create: vi.fn(), findOwnedById: vi.fn(), update: vi.fn(), delete: vi.fn() },
  isbnService: { validate: vi.fn(), lookup: vi.fn() },
  storageService: { delete: vi.fn() }
}));

vi.mock('../src/modules/books/books.repository.js', () => ({ booksRepository: mocks.booksRepository }));
vi.mock('../src/modules/isbn/isbn.service.js', () => ({ isbnService: mocks.isbnService }));
vi.mock('../src/modules/media/storage.service.js', () => ({ storageService: mocks.storageService }));

const { booksService } = await import('../src/modules/books/books.service.js');

const ownerId = '10000000-0000-4000-8000-000000000001';
const bookId = '20000000-0000-4000-8000-000000000002';
const isbn = '9788545702870';
const dates = { createdAt: new Date('2026-08-31T10:00:00Z'), updatedAt: new Date('2026-08-31T10:00:00Z') };

describe('booksService', () => {
  beforeEach(() => {
    mocks.isbnService.validate.mockReturnValue(isbn);
    mocks.isbnService.lookup.mockResolvedValue({ source: 'BRASIL_API', book: { coverUrl: 'https://provider.example/cover.jpg' } });
    mocks.booksRepository.create.mockImplementation(async (data) => ({ id: bookId, ...data, images: [], ...dates }));
  });

  it('ignora origem e capa forjadas pelo cliente e usa dados confirmados no backend', async () => {
    const result = await booksService.create(ownerId, {
      title: 'Livro confiável',
      isbn,
      isbnProvider: 'ATACANTE',
      coverExternalUrl: 'https://attacker.example/tracker.gif'
    });

    expect(mocks.booksRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      ownerId,
      isbn,
      isbnStatus: 'VALID',
      isbnProvider: 'BRASIL_API',
      coverExternalUrl: 'https://provider.example/cover.jpg'
    }));
    expect(result.hasIsbnBadge).toBe(true);
    expect(result).not.toHaveProperty('ownerId');
  });

  it('mantém ISBN válido como manual quando o provedor está indisponível', async () => {
    mocks.isbnService.lookup.mockRejectedValue(new AppError('Indisponível', { statusCode: 503, code: 'ISBN_PROVIDER_UNAVAILABLE' }));

    await booksService.create(ownerId, { title: 'Cadastro manual', isbn });

    expect(mocks.booksRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      isbnProvider: 'MANUAL',
      coverExternalUrl: null,
      isbnStatus: 'VALID'
    }));
  });

  it('não esconde falhas internas inesperadas durante a confirmação do ISBN', async () => {
    mocks.isbnService.lookup.mockRejectedValue(new TypeError('Contrato inesperado'));

    await expect(booksService.create(ownerId, { title: 'Falha real', isbn })).rejects.toThrow('Contrato inesperado');
    expect(mocks.booksRepository.create).not.toHaveBeenCalled();
  });

  it('bloqueia atualização de livro que não pertence ao usuário', async () => {
    mocks.booksRepository.findOwnedById.mockResolvedValue(null);

    await expect(booksService.update(ownerId, bookId, { title: 'Tentativa' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'BOOK_NOT_FOUND'
    });
    expect(mocks.booksRepository.update).not.toHaveBeenCalled();
  });

  it('remove objetos do storage antes de excluir o livro', async () => {
    mocks.booksRepository.findOwnedById.mockResolvedValue({
      id: bookId,
      ownerId,
      images: [{ storageKey: 'books/owner/book/cover.jpg' }, { storageKey: null }]
    });

    await booksService.delete(ownerId, bookId);

    expect(mocks.storageService.delete).toHaveBeenCalledOnce();
    expect(mocks.storageService.delete).toHaveBeenCalledWith('books/owner/book/cover.jpg');
    expect(mocks.booksRepository.delete).toHaveBeenCalledWith(bookId);
  });
});
