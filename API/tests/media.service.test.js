import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  booksRepository: { findOwnedById: vi.fn() },
  mediaRepository: { create: vi.fn(), findById: vi.fn(), delete: vi.fn() },
  storageService: { assertUploaded: vi.fn(), getPublicUrl: vi.fn(), delete: vi.fn(), createPresignedUpload: vi.fn() }
}));

vi.mock('../src/modules/books/books.repository.js', () => ({ booksRepository: mocks.booksRepository }));
vi.mock('../src/modules/media/media.repository.js', () => ({ mediaRepository: mocks.mediaRepository }));
vi.mock('../src/modules/media/storage.service.js', () => ({ storageService: mocks.storageService }));

const { mediaService } = await import('../src/modules/media/media.service.js');

const ownerId = '10000000-0000-4000-8000-000000000001';
const bookId = '20000000-0000-4000-8000-000000000002';
const imageId = '30000000-0000-4000-8000-000000000003';
const base = { imageId, mimeType: 'image/jpeg', size: 1024, isCover: true };

describe('mediaService', () => {
  beforeEach(() => {
    mocks.booksRepository.findOwnedById.mockResolvedValue({ id: bookId, ownerId });
    mocks.storageService.getPublicUrl.mockReturnValue('https://cdn.example/cover.jpg');
    mocks.mediaRepository.create.mockImplementation(async (data) => data);
  });

  it('rejeita chave que apenas imita o prefixo do livro', async () => {
    const storageKey = `books/${ownerId}/${bookId}-outro/${imageId}.jpg`;

    await expect(mediaService.complete(ownerId, bookId, { ...base, storageKey })).rejects.toMatchObject({ code: 'IMAGE_KEY_FORBIDDEN' });
    expect(mocks.storageService.assertUploaded).not.toHaveBeenCalled();
  });

  it('confirma upload somente para a chave exata autorizada', async () => {
    const storageKey = `books/${ownerId}/${bookId}/${imageId}.jpg`;

    await mediaService.complete(ownerId, bookId, { ...base, storageKey });

    expect(mocks.storageService.assertUploaded).toHaveBeenCalledWith(storageKey, expect.objectContaining(base));
    expect(mocks.mediaRepository.create).toHaveBeenCalledWith(expect.objectContaining({ bookId, imageId, storageKey }));
  });

  it('tenta limpar o objeto quando a gravação dos metadados falha', async () => {
    const storageKey = `books/${ownerId}/${bookId}/${imageId}.jpg`;
    mocks.mediaRepository.create.mockRejectedValue(new Error('Banco indisponível'));

    await expect(mediaService.complete(ownerId, bookId, { ...base, storageKey })).rejects.toThrow('Banco indisponível');
    expect(mocks.storageService.delete).toHaveBeenCalledWith(storageKey);
  });
});
