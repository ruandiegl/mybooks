import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn()
}));

vi.mock('../src/shared/database/prisma.js', () => ({
  prisma: { interaction: { findMany: mocks.findMany } }
}));

const { likesRepository } = await import('../src/modules/likes/likes.repository.js');

describe('likesRepository book image selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
  });

  it('loads the first sequenced image deterministically with its private R2 key', async () => {
    await likesRepository.findReceivedLikes('user-id', { limit: 10, sort: 'desc' });

    const receivedQuery = mocks.findMany.mock.calls[0][0];
    const actorImages = receivedQuery.include.actor.select.books.select.images;
    const targetImages = receivedQuery.include.targetBook.select.images;

    for (const images of [actorImages, targetImages]) {
      expect(images.take).toBe(1);
      expect(images.orderBy).toEqual([{ sortOrder: 'asc' }, { id: 'asc' }]);
      expect(images.select).toMatchObject({ id: true, storageKey: true, sortOrder: true });
    }
  });

  it('uses the same cover ordering for sent likes', async () => {
    await likesRepository.findSentLikes('user-id', { limit: 10, sort: 'desc' });

    const images = mocks.findMany.mock.calls[0][0].include.targetBook.select.images;
    expect(images.take).toBe(1);
    expect(images.orderBy).toEqual([{ sortOrder: 'asc' }, { id: 'asc' }]);
    expect(images.select).toMatchObject({ id: true, storageKey: true, sortOrder: true });
  });
});
