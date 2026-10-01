import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  env: { NODE_ENV: 'development' }
}));

vi.mock('../src/shared/database/prisma.js', () => ({
  prisma: { book: { findMany: mocks.findMany } }
}));

vi.mock('../src/config/env.js', () => ({
  env: mocks.env
}));

const { booksRepository } = await import('../src/modules/books/books.repository.js');

const ownerId = '10000000-0000-4000-8000-000000000001';
const book = { id: '20000000-0000-4000-8000-000000000001' };

describe('booksRepository.listDiscovery', () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.env.NODE_ENV = 'development';
  });

  it('retorna livros inéditos sem consultar a fila de repetição', async () => {
    mocks.findMany.mockResolvedValueOnce([book]);

    const result = await booksRepository.listDiscovery(ownerId, { limit: 20 });

    expect(result).toEqual([book]);
    expect(mocks.findMany).toHaveBeenCalledOnce();
    expect(mocks.findMany.mock.calls[0][0].where).toMatchObject({
      ownerId: { not: ownerId },
      availability: 'AVAILABLE',
      interactions: { none: { actorId: ownerId } }
    });
  });

  it('reabre livros recusados quando a fila inédita termina', async () => {
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([book]);

    const result = await booksRepository.listDiscovery(ownerId, { limit: 20 });

    expect(result).toEqual([book]);
    expect(mocks.findMany).toHaveBeenCalledTimes(2);
    expect(mocks.findMany.mock.calls[1][0].where).toMatchObject({
      ownerId: { not: ownerId },
      availability: 'AVAILABLE',
      interactions: { some: { actorId: ownerId, action: 'PASS' } }
    });
  });

  it('reabre livros recusados quando a fila inédita termina em produção', async () => {
    mocks.env.NODE_ENV = 'production';
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([book]);

    const result = await booksRepository.listDiscovery(ownerId, { limit: 20 });

    expect(result).toEqual([book]);
    expect(mocks.findMany).toHaveBeenCalledTimes(2);
    expect(mocks.findMany.mock.calls[1][0].where).toMatchObject({
      ownerId: { not: ownerId },
      availability: 'AVAILABLE',
      interactions: { some: { actorId: ownerId, action: 'PASS' } }
    });
  });
});
