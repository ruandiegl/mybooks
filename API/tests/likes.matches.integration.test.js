import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const databaseUrl = process.env.LIKES_TEST_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;

// Never fall back to DATABASE_URL: this suite writes only to an explicitly named local test DB.
vi.mock('../src/shared/database/prisma.js', async () => {
  if (!process.env.LIKES_TEST_DATABASE_URL) return { prisma: null };
  const url = new URL(process.env.LIKES_TEST_DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/mybooks_likes_test') {
    throw new Error('LIKES_TEST_DATABASE_URL must point to the local mybooks_likes_test database.');
  }
  const { PrismaClient } = await import('@prisma/client');
  return { prisma: new PrismaClient({ datasources: { db: { url: url.href } } }) };
});

const { prisma } = await import('../src/shared/database/prisma.js');
const { likesService } = await import('../src/modules/likes/likes.service.js');
const { matchesService } = await import('../src/modules/matches/matches.service.js');
const createdUserIds = [];
let reader, partner, outsider, ownBook, secondBook, partnerBook;

async function user(name) {
  const now = Date.now();
  const result = await prisma.user.create({ data: {
    name, email: `received-match-${randomUUID()}@example.test`, passwordHash: 'test-only-password-hash', isActive: true,
    emailVerifiedAt: new Date(now), premiumTrialStartedAt: new Date(now - 1000),
    premiumTrialEndsAt: new Date(now + 86_400_000)
  } });
  createdUserIds.push(result.id);
  return result;
}
const book = (ownerId, title) => prisma.book.create({ data: { ownerId, title, authors: [], subjects: [] } });
const like = (actorId, targetBookId) => matchesService.interact(actorId, { targetBookId, action: 'LIKE', clientActionId: randomUUID() });
const received = userId => likesService.getReceivedLikes(userId, { limit: 20 });

databaseDescribe('received likes after a confirmed match (local PostgreSQL)', () => {
  beforeAll(async () => { await prisma.$connect(); });
  beforeEach(async () => {
    reader = await user('Reader'); partner = await user('Partner'); outsider = await user('Unmatched');
    ownBook = await book(reader.id, 'A — shared pending');
    secondBook = await book(reader.id, 'B — matched only');
    partnerBook = await book(partner.id, 'Partner book');
  });
  afterAll(async () => {
    if (!prisma) return;
    try { await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }); }
    finally { await prisma.$disconnect(); }
  });

  it('removes all matched-partner received likes in both directions, preserving sent likes and the conversation', async () => {
    await like(partner.id, ownBook.id); await like(partner.id, secondBook.id);
    await like(outsider.id, ownBook.id);
    expect((await received(reader.id)).items).toHaveLength(3);
    await expect(likesService.getReceivedLikesCount(reader.id)).resolves.toEqual({ count: 3 });

    const result = await like(reader.id, partnerBook.id);
    expect(result.match).toMatchObject({ status: 'ACTIVE', otherUser: { id: partner.id } });
    // Repeated reads represent reload/new device; both canonical user orderings are exercised.
    for (let reload = 0; reload < 2; reload++) {
      expect((await received(reader.id)).items.map(item => item.actor.id)).toEqual([outsider.id]);
      expect((await received(partner.id)).items).toEqual([]);
    }
    await expect(likesService.getReceivedLikesCount(reader.id)).resolves.toEqual({ count: 1 });
    await expect(likesService.getReceivedLikesCount(partner.id)).resolves.toEqual({ count: 0 });
    await expect(likesService.getUserBooksWithLikes(reader.id)).resolves.toEqual([{ id: ownBook.id, title: ownBook.title }]);
    await expect(likesService.getUserBooksWithLikes(partner.id)).resolves.toEqual([]);
    expect((await likesService.getSentLikes(reader.id, {})).items).toHaveLength(1);
    expect((await likesService.getSentLikes(partner.id, {})).items).toHaveLength(2);
    await expect(prisma.interaction.count({ where: { actorId: { in: [reader.id, partner.id, outsider.id] }, action: 'LIKE' } })).resolves.toBe(4);
    await expect(prisma.conversation.count({ where: { id: result.match.conversationId, members: { every: { userId: { in: [reader.id, partner.id] } } } } })).resolves.toBe(1);
  });

  it('excludes an active match from count and filters even without a reverse interaction', async () => {
    await like(partner.id, ownBook.id);
    const [userAId, userBId] = [reader.id, partner.id].sort();
    await prisma.match.create({ data: { userAId, userBId, status: 'ACTIVE' } });
    expect((await received(reader.id)).items).toEqual([]);
    await expect(likesService.getReceivedLikesCount(reader.id)).resolves.toEqual({ count: 0 });
    await expect(likesService.getUserBooksWithLikes(reader.id)).resolves.toEqual([]);
  });

  it('keeps unmatched and archived-match likes and applies exclusion before pagination and book filtering', async () => {
    await like(partner.id, secondBook.id);
    await like(partner.id, ownBook.id);
    await like(outsider.id, ownBook.id);
    const [userAId, userBId] = [reader.id, partner.id].sort();
    const pair = await prisma.match.create({ data: { userAId, userBId, status: 'ARCHIVED' } });
    expect((await received(reader.id)).items).toHaveLength(3);
    await expect(likesService.getReceivedLikesCount(reader.id)).resolves.toEqual({ count: 3 });
    await prisma.match.update({ where: { id: pair.id }, data: { status: 'ACTIVE' } });
    const page = await likesService.getReceivedLikes(reader.id, { limit: 1, sort: 'asc', bookId: ownBook.id });
    expect(page.items.map(item => item.actor.id)).toEqual([outsider.id]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
    expect((await likesService.getReceivedLikes(reader.id, { bookId: secondBook.id })).items).toEqual([]);
  });

  it('keeps received likes when the attempted reciprocal like is rejected', async () => {
    await like(partner.id, ownBook.id);
    await prisma.book.update({ where: { id: partnerBook.id }, data: { availability: 'RESERVED' } });
    await expect(like(reader.id, partnerBook.id)).rejects.toMatchObject({ code: 'DISCOVERY_BOOK_NOT_FOUND' });
    expect((await received(reader.id)).items.map(item => item.actor.id)).toEqual([partner.id]);
    await expect(likesService.getReceivedLikesCount(reader.id)).resolves.toEqual({ count: 1 });
  });

  it.each(['asc', 'desc'])('continues %s pagination when a previously displayed cursor belongs to the matched partner', async sort => {
    const fourth = await user('Another unmatched reader');
    const first = await like(partner.id, ownBook.id);
    const second = await like(outsider.id, ownBook.id);
    const third = await like(fourth.id, ownBook.id);
    for (const [index, result] of [first, second, third].entries()) {
      const day = sort === 'asc' ? index + 1 : 3 - index;
      await prisma.interaction.update({ where: { id: result.interaction.id }, data: { createdAt: new Date(`2026-01-0${day}T12:00:00Z`) } });
    }
    await like(reader.id, partnerBook.id);
    const page = await likesService.getReceivedLikes(reader.id, { cursor: first.interaction.id, limit: 1, sort });
    expect(page.items.map(item => item.actor.id)).toEqual([outsider.id]);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe(second.interaction.id);
    const next = await likesService.getReceivedLikes(reader.id, { cursor: page.nextCursor, limit: 1, sort });
    expect(next.items.map(item => item.actor.id)).toEqual([fourth.id]);
    expect(next.hasMore).toBe(false);
  });

  it('does not accept a pagination cursor belonging to another book owner', async () => {
    await like(partner.id, ownBook.id);
    const foreign = await like(outsider.id, partnerBook.id);
    expect((await likesService.getReceivedLikes(reader.id, { cursor: foreign.interaction.id })).items).toEqual([]);
    expect((await likesService.getReceivedLikes(reader.id, { cursor: randomUUID() })).items).toEqual([]);
  });
});
