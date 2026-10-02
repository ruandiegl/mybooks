import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock('../src/shared/database/prisma.js', () => ({
  prisma: { interaction: { findMany: mocks.findMany } }
}));

const { likesRepository } = await import('../src/modules/likes/likes.repository.js');

const userId = '10000000-0000-4000-8000-000000000001';
const query = { limit: 20, sort: 'desc' };

describe('likesRepository: capa na ordem da galeria', () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.findMany.mockResolvedValue([]);
  });

  it('prioriza a foto 1 nas curtidas enviadas, antes da data do upload', async () => {
    await likesRepository.findSentLikes(userId, query);

    const images = mocks.findMany.mock.calls[0][0].include.targetBook.select.images;
    expect(images).toMatchObject({
      take: 1,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
  });

  it('prioriza a foto 1 do livro curtido nas curtidas recebidas', async () => {
    await likesRepository.findReceivedLikes(userId, query);

    const images = mocks.findMany.mock.calls[0][0].include.targetBook.select.images;
    expect(images).toMatchObject({
      take: 1,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
  });

  it('prioriza a foto 1 do livro de quem curtiu nas curtidas recebidas', async () => {
    await likesRepository.findReceivedLikes(userId, query);

    const images = mocks.findMany.mock.calls[0][0].include.actor.select.books.select.images;
    expect(images).toEqual({
      take: 1,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { url: true }
    });
  });
});
