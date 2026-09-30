import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  booksRepository: { findOwnedById: vi.fn() },
  mediaRepository: { create: vi.fn(), complete: vi.fn(), reorder: vi.fn(), enqueueCleanup: vi.fn(), remove: vi.fn(), findById: vi.fn(), delete: vi.fn() },
  storageService: { assertImage: vi.fn(), assertUploaded: vi.fn(), copy: vi.fn(), getPresignedGetUrl: vi.fn(), delete: vi.fn(), createPresignedUpload: vi.fn() },
  storageCleanupService: { process: vi.fn() }
}));

vi.mock('../src/modules/books/books.repository.js', () => ({ booksRepository: mocks.booksRepository }));
vi.mock('../src/modules/media/media.repository.js', () => ({ mediaRepository: mocks.mediaRepository }));
vi.mock('../src/modules/media/storage.service.js', () => ({ storageService: mocks.storageService }));
vi.mock('../src/modules/media/storageCleanup.service.js', () => ({ storageCleanupService: mocks.storageCleanupService }));

const { mediaService } = await import('../src/modules/media/media.service.js');

const ownerId = '10000000-0000-4000-8000-000000000001';
const bookId = '20000000-0000-4000-8000-000000000002';
const imageId = '30000000-0000-4000-8000-000000000003';
const base = { imageId, mimeType: 'image/jpeg', size: 1024, isCover: true };

describe('mediaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.booksRepository.findOwnedById.mockResolvedValue({ id: bookId, ownerId });
    mocks.storageService.delete.mockResolvedValue(undefined);
    mocks.storageService.copy.mockResolvedValue(undefined);
    mocks.storageService.createPresignedUpload.mockResolvedValue({
      uploadUrl: 'https://r2.example/put',
      storageKey: `pending/books/${ownerId}/${bookId}/${imageId}.jpg`,
      expiresIn: 300,
      headers: { 'Content-Type': 'image/jpeg' }
    });
    mocks.storageService.getPresignedGetUrl.mockResolvedValue({
      url: 'https://r2.example/get',
      expiresAt: '2026-10-01T00:00:00.000Z'
    });
    mocks.mediaRepository.complete.mockImplementation(async (data) => ({ id: data.imageId, ...data, sortOrder: 0, isCover: true }));
    mocks.mediaRepository.reorder.mockImplementation(async ({ imageIds }) => imageIds);
  });

  it('rejeita chave que apenas imita o prefixo do livro', async () => {
    const storageKey = `books/${ownerId}/${bookId}-outro/${imageId}.jpg`;

    await expect(mediaService.complete(ownerId, bookId, { ...base, storageKey })).rejects.toMatchObject({ code: 'IMAGE_KEY_FORBIDDEN' });
    expect(mocks.storageService.assertUploaded).not.toHaveBeenCalled();
  });

  it('confirma upload somente para a chave exata autorizada', async () => {
    const storageKey = `pending/books/${ownerId}/${bookId}/${imageId}.jpg`;

    const result = await mediaService.complete(ownerId, bookId, { ...base, storageKey });

    expect(mocks.storageService.assertUploaded).toHaveBeenCalledWith(storageKey, expect.objectContaining(base));
    expect(mocks.mediaRepository.complete).toHaveBeenCalledWith(expect.objectContaining({
      bookId,
      imageId,
      storageKey: `books/${ownerId}/${bookId}/${imageId}.jpg`
    }));
    expect(result).toMatchObject({
      id: imageId,
      url: 'https://r2.example/get',
      sortOrder: 0,
      isCover: true,
      expiresAt: '2026-10-01T00:00:00.000Z'
    });
    expect(result).not.toHaveProperty('storageKey');
    expect(result).not.toHaveProperty('bookId');
  });

  it('tenta limpar o objeto quando a gravação dos metadados falha', async () => {
    const storageKey = `pending/books/${ownerId}/${bookId}/${imageId}.jpg`;
    mocks.mediaRepository.complete.mockRejectedValue(new Error('Banco indisponível'));

    await expect(mediaService.complete(ownerId, bookId, { ...base, storageKey })).rejects.toThrow('Banco indisponível');
    expect(mocks.storageService.delete).toHaveBeenCalledWith(storageKey);
  });

  it('emite uploads temporários sem depender de URL pública do bucket', async () => {
    const result = await mediaService.presign(ownerId, bookId, { mimeType: 'image/jpeg', size: 1024 });

    expect(result.storageKey).toBe(`pending/books/${ownerId}/${bookId}/${imageId}.jpg`);
  });

  it('rejeita reordenação com IDs duplicados antes de chamar o repositório', async () => {
    await expect(mediaService.reorder(ownerId, bookId, { imageIds: [imageId, imageId] }))
      .rejects.toMatchObject({ code: 'IMAGE_ORDER_INVALID', statusCode: 422 });
    expect(mocks.mediaRepository.reorder).not.toHaveBeenCalled();
  });

  it('delegates a validação da lista completa e a persistência ao repositório transacional', async () => {
    const secondImageId = '40000000-0000-4000-8000-000000000004';

    await mediaService.reorder(ownerId, bookId, { imageIds: [secondImageId, imageId] });

    expect(mocks.mediaRepository.reorder).toHaveBeenCalledWith({ ownerId, bookId, imageIds: [secondImageId, imageId] });
  });

  it('não cria upload para livro de outra pessoa', async () => {
    mocks.booksRepository.findOwnedById.mockResolvedValue(null);

    await expect(mediaService.presign(ownerId, bookId, { mimeType: 'image/jpeg', size: 1024 }))
      .rejects.toMatchObject({ code: 'BOOK_NOT_FOUND', statusCode: 404 });
    expect(mocks.storageService.createPresignedUpload).not.toHaveBeenCalled();
  });
});
