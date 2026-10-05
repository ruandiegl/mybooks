import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  likesRepository: {
    findReceivedLikes: vi.fn(),
    findSentLikes: vi.fn(),
    countPendingReceivedLikes: vi.fn(),
    findUserBooksWithLikes: vi.fn()
  },
  premiumService: { hasActiveTrial: vi.fn() },
  storageService: { getPresignedGetUrl: vi.fn() }
}));

vi.mock('../src/modules/likes/likes.repository.js', () => ({ likesRepository: mocks.likesRepository }));
vi.mock('../src/modules/premium/premium.service.js', () => ({ premiumService: mocks.premiumService }));
vi.mock('../src/modules/media/storage.service.js', () => ({ storageService: mocks.storageService }));

const { likesService } = await import('../src/modules/likes/likes.service.js');

const userId = '10000000-0000-4000-8000-000000000001';
const otherUserId = '20000000-0000-4000-8000-000000000002';
const bookId = '30000000-0000-4000-8000-000000000003';
const interactionId = '40000000-0000-4000-8000-000000000004';

describe('likesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.premiumService.hasActiveTrial.mockResolvedValue(true);
  });

  describe('getReceivedLikes', () => {
    it('uses the first ordered photo and signs private R2 covers', async () => {
      mocks.storageService.getPresignedGetUrl.mockImplementation(async (storageKey) => ({
        url: `https://signed.example/${storageKey}`,
        expiresAt: '2026-09-30T12:05:00.000Z'
      }));
      mocks.likesRepository.findReceivedLikes.mockResolvedValue([{
        id: interactionId,
        createdAt: new Date('2026-09-24T12:00:00Z'),
        actor: {
          id: otherUserId,
          name: 'Bia',
          books: [{
            id: '50000000-0000-4000-8000-000000000005',
            title: 'A Hora da Estrela',
            images: [
              { id: 'z-second', storageKey: 'books/actor/second.jpg', sortOrder: 0 },
              { id: 'a-cover', storageKey: 'books/actor/cover.jpg', sortOrder: 0 }
            ]
          }]
        },
        targetBook: {
          id: bookId,
          title: 'Dom Casmurro',
          images: [
            { id: 'z-second', storageKey: 'books/target/second.jpg', sortOrder: 0 },
            { id: 'a-cover', storageKey: 'books/target/cover.jpg', sortOrder: 0 }
          ]
        }
      }]);

      const result = await likesService.getReceivedLikes(userId, { limit: 10 });

      expect(result.items[0].actorBook.coverUrl).toBe('https://signed.example/books/actor/cover.jpg');
      expect(result.items[0].book.coverUrl).toBe('https://signed.example/books/target/cover.jpg');
      expect(result.items[0].book.coverUrlExpiresAt).toBe('2026-09-30T12:05:00.000Z');
      expect(result.items[0].actorBook.coverUrlExpiresAt).toBe('2026-09-30T12:05:00.000Z');
      expect(mocks.storageService.getPresignedGetUrl).toHaveBeenCalledWith('books/actor/cover.jpg');
      expect(mocks.storageService.getPresignedGetUrl).toHaveBeenCalledWith('books/target/cover.jpg');
      expect(mocks.storageService.getPresignedGetUrl).toHaveBeenCalledTimes(2);
    });

    it('retorna lista formatada de curtidas recebidas com paginação', async () => {
      const createdAt = new Date('2026-09-24T12:00:00Z');
      mocks.likesRepository.findReceivedLikes.mockResolvedValue([
        {
          id: interactionId,
          createdAt,
          actor: {
            id: otherUserId,
            name: 'Bia',
            avatarUrl: 'https://example.com/avatar.jpg',
            city: 'São Paulo',
            books: [{
              id: '50000000-0000-4000-8000-000000000005',
              title: 'A Hora da Estrela',
              images: [{ url: 'https://example.com/actor-book.jpg' }]
            }]
          },
          targetBook: {
            id: bookId,
            title: 'Dom Casmurro',
            images: [{ url: 'https://example.com/cover.jpg' }]
          }
        }
      ]);

      const result = await likesService.getReceivedLikes(userId, { limit: 10, sort: 'desc' });

      expect(mocks.likesRepository.findReceivedLikes).toHaveBeenCalledWith(userId, {
        limit: 10,
        sort: 'desc'
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: interactionId,
        actor: { id: otherUserId, name: 'Bia', avatarUrl: 'https://example.com/avatar.jpg', avatarUrlExpiresAt: null, avatarVersion: 0, city: 'São Paulo' },
        actorBook: {
          id: '50000000-0000-4000-8000-000000000005',
          title: 'A Hora da Estrela',
          coverUrl: 'https://example.com/actor-book.jpg', coverUrlExpiresAt: null
        },
        book: { id: bookId, title: 'Dom Casmurro', coverUrl: 'https://example.com/cover.jpg', coverUrlExpiresAt: null },
        likedAt: createdAt
      });
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('identifica hasMore e nextCursor quando excede o limite', async () => {
      const mockItems = [
        {
          id: '10000000-0000-4000-8000-000000000011',
          createdAt: new Date(),
          actor: { id: otherUserId, name: 'User 1' },
          targetBook: { id: bookId, title: 'Livro 1', images: [] }
        },
        {
          id: '10000000-0000-4000-8000-000000000012',
          createdAt: new Date(),
          actor: { id: otherUserId, name: 'User 2' },
          targetBook: { id: bookId, title: 'Livro 2', images: [] }
        }
      ];
      mocks.likesRepository.findReceivedLikes.mockResolvedValue(mockItems);

      const result = await likesService.getReceivedLikes(userId, { limit: 1 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].actorBook).toBeNull();
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('10000000-0000-4000-8000-000000000011');
    });
  });

  describe('Premium privacy gates', () => {
    it('denies received identities before querying them for a free account', async () => {
      mocks.premiumService.hasActiveTrial.mockResolvedValue(false);

      await expect(likesService.getReceivedLikes(userId, {})).rejects.toMatchObject({
        statusCode: 403,
        code: 'PREMIUM_REQUIRED'
      });
      expect(mocks.likesRepository.findReceivedLikes).not.toHaveBeenCalled();
    });

    it('denies the received-books filter before querying private book identities', async () => {
      mocks.premiumService.hasActiveTrial.mockResolvedValue(false);

      await expect(likesService.getUserBooksWithLikes(userId)).rejects.toMatchObject({
        statusCode: 403,
        code: 'PREMIUM_REQUIRED'
      });
      expect(mocks.likesRepository.findUserBooksWithLikes).not.toHaveBeenCalled();
    });

    it('keeps aggregate count and sent likes available to a free account', async () => {
      mocks.premiumService.hasActiveTrial.mockResolvedValue(false);
      mocks.likesRepository.countPendingReceivedLikes.mockResolvedValue(4);
      mocks.likesRepository.findSentLikes.mockResolvedValue([]);

      await expect(likesService.getReceivedLikesCount(userId)).resolves.toEqual({ count: 4 });
      await expect(likesService.getSentLikes(userId, {})).resolves.toMatchObject({ items: [] });
      expect(mocks.likesRepository.countPendingReceivedLikes).toHaveBeenCalledOnce();
      expect(mocks.likesRepository.findSentLikes).toHaveBeenCalledOnce();
    });
  });

  describe('getSentLikes', () => {
    it('retorna lista formatada de curtidas enviadas', async () => {
      const createdAt = new Date('2026-09-24T12:00:00Z');
      mocks.likesRepository.findSentLikes.mockResolvedValue([
        {
          id: interactionId,
          createdAt,
          targetBook: {
            id: bookId,
            title: '1984',
            owner: { id: otherUserId, name: 'Carlos', avatarUrl: null, city: 'Curitiba' },
            images: [{ url: 'https://example.com/1984.jpg' }]
          }
        }
      ]);

      const result = await likesService.getSentLikes(userId, { limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: interactionId,
        book: { id: bookId, title: '1984', coverUrl: 'https://example.com/1984.jpg', coverUrlExpiresAt: null },
        owner: { id: otherUserId, name: 'Carlos', avatarUrl: null, avatarUrlExpiresAt: null, avatarVersion: 0, city: 'Curitiba' },
        likedAt: createdAt
      });
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getReceivedLikesCount', () => {
    it('retorna contagem de curtidas pendentes', async () => {
      mocks.likesRepository.countPendingReceivedLikes.mockResolvedValue(5);

      const result = await likesService.getReceivedLikesCount(userId);

      expect(mocks.likesRepository.countPendingReceivedLikes).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('getUserBooksWithLikes', () => {
    it('retorna livros com curtidas para filtro', async () => {
      mocks.likesRepository.findUserBooksWithLikes.mockResolvedValue([
        { id: bookId, title: 'Dom Casmurro' }
      ]);

      const result = await likesService.getUserBooksWithLikes(userId);

      expect(result).toEqual([{ id: bookId, title: 'Dom Casmurro' }]);
    });
  });
});
