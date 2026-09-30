import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    bookImage: {
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    storageCleanupJob: { upsert: vi.fn() }
  };
  return { tx, prisma: { $transaction: vi.fn((callback) => callback(tx)), bookImage: { findUnique: vi.fn() } } };
});

vi.mock('../src/shared/database/prisma.js', () => ({ prisma: mocks.prisma }));

const { mediaRepository } = await import('../src/modules/media/media.repository.js');

const ownerId = '10000000-0000-4000-8000-000000000001';
const bookId = '20000000-0000-4000-8000-000000000002';
const firstId = '30000000-0000-4000-8000-000000000003';
const secondId = '40000000-0000-4000-8000-000000000004';

describe('mediaRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.$queryRaw.mockResolvedValue([{ id: bookId }]);
    mocks.tx.bookImage.findUnique.mockResolvedValue(null);
    mocks.tx.bookImage.update.mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
  });

  it('reserva a próxima posição dentro da transação e marca somente a primeira como capa', async () => {
    mocks.tx.bookImage.count.mockResolvedValue(2);
    mocks.tx.bookImage.create.mockImplementation(async ({ data }) => data);

    const image = await mediaRepository.complete({
      imageId: secondId,
      bookId,
      ownerId,
      storageKey: 'books/owner/book/second.jpg',
      mimeType: 'image/jpeg',
      size: 1024
    });

    expect(mocks.prisma.$transaction).toHaveBeenCalledOnce();
    expect(mocks.tx.bookImage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 2, isCover: false })
    });
    expect(image.sortOrder).toBe(2);
  });

  it('não grava uma quarta foto', async () => {
    mocks.tx.bookImage.count.mockResolvedValue(3);

    await expect(mediaRepository.complete({ imageId: secondId, bookId, ownerId }))
      .rejects.toMatchObject({ code: 'IMAGE_LIMIT_REACHED', statusCode: 409 });
    expect(mocks.tx.bookImage.create).not.toHaveBeenCalled();
  });

  it('rejeita lista parcial e não altera posições', async () => {
    mocks.tx.bookImage.findMany.mockResolvedValue([{ id: firstId }, { id: secondId }]);

    await expect(mediaRepository.reorder({ ownerId, bookId, imageIds: [firstId] }))
      .rejects.toMatchObject({ code: 'IMAGE_ORDER_INVALID', statusCode: 422 });
    expect(mocks.tx.bookImage.update).not.toHaveBeenCalled();
  });

  it('move IDs para posições temporárias antes de trocar a ordem final', async () => {
    const rows = [{ id: firstId }, { id: secondId }];
    mocks.tx.bookImage.findMany.mockResolvedValueOnce(rows).mockResolvedValueOnce(rows);

    await mediaRepository.reorder({ ownerId, bookId, imageIds: [secondId, firstId] });

    expect(mocks.tx.bookImage.update.mock.calls.map(([{ where, data }]) => [where.id, data.sortOrder])).toEqual([
      [secondId, 100],
      [firstId, 101],
      [secondId, 0],
      [firstId, 1]
    ]);
    expect(mocks.tx.bookImage.update).toHaveBeenNthCalledWith(3, {
      where: { id: secondId },
      data: { sortOrder: 0, isCover: true }
    });
  });

  it('registra limpeza no mesmo commit em que remove a foto', async () => {
    mocks.tx.bookImage.findFirst.mockResolvedValue({
      id: firstId,
      bookId,
      storageKey: 'books/owner/book/cover.jpg',
      sortOrder: 0
    });
    mocks.tx.bookImage.findMany.mockResolvedValue([]);

    await mediaRepository.remove({ ownerId, bookId, imageId: firstId });

    expect(mocks.tx.storageCleanupJob.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { storageKey: 'books/owner/book/cover.jpg' }
    }));
    expect(mocks.tx.bookImage.delete).toHaveBeenCalledWith({ where: { id: firstId } });
  });
});
