import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('../../../services/api', () => ({ api: mocks }));

const { deleteBookPhoto, saveBookPhotoOrder, uploadBookPhoto } = await import('../bookPhotoUpload');

describe('book photo upload contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.post
      .mockResolvedValueOnce({ data: { data: {
        imageId: '30000000-0000-4000-8000-000000000003',
        uploadUrl: 'https://r2.example/signed-put',
        storageKey: 'pending/books/owner/book/image.jpg',
        headers: { 'Content-Type': 'image/jpeg' },
        expiresIn: 300
      } } })
      .mockResolvedValueOnce({ data: { data: {
        id: '30000000-0000-4000-8000-000000000003',
        url: 'https://r2.example/signed-get',
        sortOrder: 0,
        isCover: true,
        expiresAt: '2026-10-01T00:00:00.000Z'
      } } });
    mocks.put.mockResolvedValue({ data: { data: {} } });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ blob: async () => new Blob(['photo']) })
      .mockResolvedValueOnce({ ok: true }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('envia bytes pelo PUT assinado e só depois confirma os metadados', async () => {
    const image = await uploadBookPhoto('book/one', {
      id: 'local',
      uri: 'file://cover.jpg',
      mimeType: 'image/jpeg',
      size: 5
    });

    expect(mocks.post).toHaveBeenNthCalledWith(1, '/api/v1/books/book%2Fone/images/presign', {
      mimeType: 'image/jpeg',
      size: 5
    });
    expect(fetch).toHaveBeenNthCalledWith(2, 'https://r2.example/signed-put', expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' }
    }));
    expect(mocks.post).toHaveBeenNthCalledWith(2, '/api/v1/books/book%2Fone/images/complete', {
      imageId: '30000000-0000-4000-8000-000000000003',
      storageKey: 'pending/books/owner/book/image.jpg',
      mimeType: 'image/jpeg',
      size: 5
    });
    expect(image).toMatchObject({ id: '30000000-0000-4000-8000-000000000003', sortOrder: 0, isCover: true });
  });

  it('não confirma quando o PUT falha', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ blob: async () => new Blob(['photo']) })
      .mockResolvedValueOnce({ ok: false }));

    await expect(uploadBookPhoto('book', {
      id: 'local', uri: 'file://cover.jpg', mimeType: 'image/jpeg', size: 5
    })).rejects.toThrow('O envio da foto foi interrompido');
    expect(mocks.post).toHaveBeenCalledOnce();
  });

  it('envia a lista completa na ordem desejada e remove pelo endpoint do livro', async () => {
    await saveBookPhotoOrder('book', ['first', 'second']);
    await deleteBookPhoto('book', 'second');

    expect(mocks.put).toHaveBeenCalledWith('/api/v1/books/book/images/order', { imageIds: ['first', 'second'] });
    expect(mocks.delete).toHaveBeenCalledWith('/api/v1/books/book/images/second');
  });
});
