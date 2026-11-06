import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  transaction: vi.fn()
}));

vi.mock('../src/shared/database/prisma.js', () => ({
  prisma: { book: { findMany: mocks.findMany }, $transaction: mocks.transaction }
}));

const { booksRepository } = await import('../src/modules/books/books.repository.js');

const viewerId = '10000000-0000-4000-8000-000000000001';
const book = { id: '20000000-0000-4000-8000-000000000001', ownerId: 'owner-a' };
const candidate = (item, action) => ({ ...item, interactions: action ? [{ action }] : [] });

describe('booksRepository.listDiscovery', () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.transaction.mockReset();
    mocks.transaction.mockImplementation(callback => callback({ book: { findMany: mocks.findMany } }));
  });

  it('retorna livros inéditos e hidrata apenas a página', async () => {
    mocks.findMany.mockResolvedValueOnce([candidate(book)]).mockResolvedValueOnce([book]);

    expect(await booksRepository.listDiscovery(viewerId, { limit: 20 })).toEqual([book]);
    expect(mocks.findMany).toHaveBeenCalledTimes(2);
    expect(mocks.findMany.mock.calls[0][0]).toMatchObject({
      where: { ownerId: { not: viewerId }, availability: 'AVAILABLE' },
      select: { id: true, ownerId: true, interactions: { where: { actorId: viewerId }, select: { action: true } } }
    });
    expect(mocks.findMany.mock.calls[1][0].where.id).toEqual({ in: [book.id] });
    expect(mocks.findMany.mock.calls[1][0].include.images.orderBy).toEqual([
      { sortOrder: 'asc' }, { id: 'asc' }
    ]);
    expect(mocks.transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
  });

  it('reabre livros recusados quando não há inéditos, inclusive em produção', async () => {
    const liked = { id: 'liked', ownerId: 'owner-b' };
    mocks.findMany.mockResolvedValueOnce([candidate(book, 'PASS'), candidate(liked, 'LIKE')]).mockResolvedValueOnce([book]);

    expect(await booksRepository.listDiscovery(viewerId, { limit: 20 })).toEqual([book]);
    expect(mocks.findMany.mock.calls[1][0].where.id).toEqual({ in: [book.id] });
  });

  it('não volta aos recusados enquanto ainda há livros inéditos', async () => {
    const unseen = { id: 'unseen', ownerId: 'owner-b' };
    mocks.findMany.mockResolvedValueOnce([candidate(book, 'PASS'), candidate(unseen)]).mockResolvedValueOnce([unseen]);

    expect(await booksRepository.listDiscovery(viewerId, { limit: 20 })).toEqual([unseen]);
    expect(mocks.findMany.mock.calls[1][0].where.id).toEqual({ in: [unseen.id] });
  });

  it('intercala donos na fila e preserva a mesma ordem entre páginas', async () => {
    const candidates = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].map(id => candidate({ id, ownerId: id[0] }));
    mocks.findMany.mockImplementation(async args => {
      if (args.select) return candidates;
      return candidates.filter(row => args.where.id.in.includes(row.id));
    });

    const firstPage = await booksRepository.listDiscovery(viewerId, { limit: 2 });
    const secondPage = await booksRepository.listDiscovery(viewerId, { limit: 2, cursor: firstPage[1].id });
    const thirdPage = await booksRepository.listDiscovery(viewerId, { limit: 2, cursor: secondPage[1].id });
    const ordered = [...firstPage.slice(0, 2), ...secondPage.slice(0, 2), ...thirdPage.slice(0, 2)];

    expect(new Set(ordered.map(row => row.id)).size).toBe(6);
    expect(new Set(ordered.slice(0, 3).map(row => row.ownerId)).size).toBe(3);
    expect(mocks.findMany.mock.calls[1][0].include.images.orderBy).toBeTruthy();
  });

  it('mantém o cursor válido depois que o livro anterior vira PASS', async () => {
    const candidates = ['A1', 'A2', 'B1', 'B2'].map(id => candidate({ id, ownerId: id[0] }));
    mocks.findMany.mockImplementation(async args => args.select
      ? candidates
      : candidates.filter(row => args.where.id.in.includes(row.id)));
    const firstPage = await booksRepository.listDiscovery(viewerId, { limit: 1 });
    const cursor = firstPage[0].id;
    candidates.find(row => row.id === cursor).interactions.push({ action: 'PASS' });

    const secondPage = await booksRepository.listDiscovery(viewerId, { limit: 1, cursor });

    expect(secondPage.length).toBeGreaterThan(0);
    expect(secondPage.every(row => row.id !== cursor)).toBe(true);
  });
});
