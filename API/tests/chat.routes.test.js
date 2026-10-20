import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/shared/http/errorHandler.js';

const mocks = vi.hoisted(() => ({ conversation: { findFirst: vi.fn(), findMany: vi.fn() } }));
vi.mock('../src/shared/database/prisma.js', () => ({ prisma: mocks }));
const { chatRouter } = await import('../src/modules/chat/chat.routes.js');
const { createApp } = await import('../src/app.js');
const userId = '10000000-0000-4000-8000-000000000001';
const conversationId = '20000000-0000-4000-8000-000000000002';
const bookId = '30000000-0000-4000-8000-000000000003';
const url = `/api/v1/conversations/${conversationId}/exchange-books/${bookId}`;
function app() {
  const instance = express();
  instance.use((req, _res, next) => { req.currentUser = { id: userId }; next(); });
  instance.use('/api/v1/conversations', chatRouter);
  instance.use(errorHandler);
  return instance;
}
beforeEach(() => { vi.resetAllMocks(); });

describe('contextual exchange book route', () => {
  it('selects only summary fields for both books when listing member conversations', async () => {
    mocks.conversation.findMany.mockResolvedValue([]);
    const response = await request(app()).get('/api/v1/conversations');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [] });
    const query = mocks.conversation.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ members: { some: { userId } } });
    for (const side of ['bookA', 'bookB']) {
      expect(query.include.match.select[side]).toEqual({ select: {
        id: true, title: true, authors: true, availability: true, coverExternalUrl: true,
        images: { select: { url: true, isCover: true }, orderBy: [{ isCover: 'desc' }, { createdAt: 'asc' }], take: 1 }
      } });
    }
  });

  it('requires authentication through the API router', async () => {
    expect((await request(createApp()).get(url)).status).toBe(401);
    expect(mocks.conversation.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    [`/api/v1/conversations/bad/exchange-books/${bookId}`],
    [`/api/v1/conversations/${conversationId}/exchange-books/bad`]
  ])('validates UUIDs before database access: %s', async (path) => {
    expect((await request(app()).get(path)).status).toBe(422);
    expect(mocks.conversation.findFirst).not.toHaveBeenCalled();
  });

  it.each(['RESERVED', 'EXCHANGED'])('returns public %s details in the data envelope', async (availability) => {
    mocks.conversation.findFirst.mockResolvedValue({ match: { bookAId: bookId, bookBId: null, bookA: { id: bookId, title: 'Livro', availability, authors: ['Autora'], subjects: [], isbnStatus: 'VALID', images: [], owner: { id: userId, name: 'Pessoa', avatarUrl: null, city: 'Recife' } }, bookB: null } });
    const response = await request(app()).get(url);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: expect.objectContaining({ id: bookId, title: 'Livro', availability, hasIsbnBadge: true, owner: { id: userId, name: 'Pessoa', avatarUrl: null, city: 'Recife' } }) });
    const query = mocks.conversation.findFirst.mock.calls[0][0];
    expect(query.where).toEqual({ id: conversationId, members: { some: { userId } }, match: { OR: [{ bookAId: bookId }, { bookBId: bookId }] } });
    for (const side of ['bookA', 'bookB']) {
      const selection = query.select.match.select[side].select;
      expect(selection.owner).toEqual({ select: { id: true, name: true, avatarUrl: true, city: true } });
      expect(selection.images.select).toEqual({ id: true, url: true, isCover: true });
      expect(selection).not.toHaveProperty('ownerId');
      expect(selection).not.toHaveProperty('interactions');
    }
  });

  it.each(['nonmember', 'missing conversation', 'missing book', 'missing link'])('hides %s with sanitized 404', async () => {
    mocks.conversation.findFirst.mockResolvedValue(null);
    const response = await request(app()).get(url);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'EXCHANGE_BOOK_NOT_FOUND', message: 'Livro da troca não encontrado.' } });
  });
});
