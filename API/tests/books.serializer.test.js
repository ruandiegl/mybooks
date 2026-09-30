import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getPresignedGetUrl: vi.fn() }));
vi.mock('../src/modules/media/storage.service.js', () => ({
  storageService: { getPresignedGetUrl: mocks.getPresignedGetUrl }
}));

const { serializeBook } = await import('../src/modules/books/books.serializer.js');

const book = {
  id: '20000000-0000-4000-8000-000000000002',
  title: 'Leitura em ordem',
  images: [],
  coverExternalUrl: null
};

describe('serializeBook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPresignedGetUrl.mockImplementation(async (storageKey) => ({
      url: `https://r2.example/${storageKey}?signed`,
      expiresAt: '2026-10-01T00:00:00.000Z'
    }));
  });

  it('ordena as imagens, assina as privadas e deriva a capa da posição zero', async () => {
    const record = {
      ...book,
      images: [
        { id: 'second', storageKey: 'books/u/b/second.jpg', url: null, sortOrder: 1, isCover: false },
        { id: 'cover', storageKey: 'books/u/b/cover.jpg', url: null, sortOrder: 0, isCover: true }
      ]
    };

    const result = await serializeBook(record);

    expect(result.images.map(({ id, sortOrder }) => [id, sortOrder])).toEqual([['cover', 0], ['second', 1]]);
    expect(result.coverUrl).toBe('https://r2.example/books/u/b/cover.jpg?signed');
    expect(result.coverUrlExpiresAt).toBe('2026-10-01T00:00:00.000Z');
    expect(result.images[1]).toMatchObject({
      url: 'https://r2.example/books/u/b/second.jpg?signed',
      expiresAt: '2026-10-01T00:00:00.000Z'
    });
    expect(result.images[0]).not.toHaveProperty('storageKey');
    expect(record.images[0].url).toBeNull();
  });

  it('preserva fotos externas legadas e usa a capa externa quando não há foto própria', async () => {
    const legacyUrl = 'https://legacy.example/photo.jpg';
    const legacyImage = await serializeBook({
      ...book,
      images: [{ id: 'legacy', storageKey: null, url: legacyUrl, sortOrder: 0, isCover: true }]
    });
    const noPhoto = await serializeBook({ ...book, coverExternalUrl: 'https://isbn.example/cover.jpg' });

    expect(legacyImage.coverUrl).toBe(legacyUrl);
    expect(legacyImage.images[0]).toMatchObject({ url: legacyUrl, expiresAt: null });
    expect(noPhoto.coverUrl).toBe('https://isbn.example/cover.jpg');
    expect(noPhoto.coverUrlExpiresAt).toBeNull();
    expect(mocks.getPresignedGetUrl).not.toHaveBeenCalled();
  });
});
