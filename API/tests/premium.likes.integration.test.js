import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matchesService } from '../src/modules/matches/matches.service.js';

const databaseUrl = process.env.PREMIUM_TEST_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;
const createdUserIds = [];

async function createUser(name, trial = null) {
  const user = await prisma.user.create({
    data: {
      name,
      email: `premium-like-${randomUUID()}@example.test`,
      passwordHash: 'test-only-password-hash',
      emailVerifiedAt: new Date(),
      isActive: true,
      ...(trial && {
        premiumTrialStartedAt: trial.startedAt,
        premiumTrialEndsAt: trial.endsAt
      })
    }
  });
  createdUserIds.push(user.id);
  return user;
}

async function createBooks(ownerId, count) {
  return Promise.all(Array.from({ length: count }, (_, index) => prisma.book.create({
    data: { title: `Quota book ${index + 1}`, ownerId, availability: 'AVAILABLE' },
    select: { id: true }
  })));
}

async function interact(actorId, bookId, action = 'LIKE') {
  return matchesService.interact(actorId, {
    targetBookId: bookId,
    action,
    clientActionId: randomUUID()
  });
}

databaseDescribe('Premium daily-like quota with PostgreSQL', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    if (createdUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it('caps free likes at 15, keeps quota after PASS, and allows same-book retry', async () => {
    const actor = await createUser('Free quota actor');
    const owner = await createUser('Free quota owner');
    const books = await createBooks(owner.id, 16);

    for (const book of books.slice(0, 15)) await interact(actor.id, book.id);
    await expect(interact(actor.id, books[15].id)).rejects.toMatchObject({ code: 'DAILY_LIKE_LIMIT_REACHED' });

    await interact(actor.id, books[0].id, 'PASS');
    await expect(interact(actor.id, books[15].id)).rejects.toMatchObject({ code: 'DAILY_LIKE_LIMIT_REACHED' });
    await expect(interact(actor.id, books[0].id)).resolves.toMatchObject({ interaction: { action: 'LIKE' } });
    await expect(prisma.likeDailyUsage.count({ where: { userId: actor.id } })).resolves.toBe(15);
  });

  it('allows more than 15 active-trial likes but does not grant a second quota after expiry', async () => {
    const now = new Date();
    const actor = await createUser('Premium quota actor', {
      startedAt: new Date(now.getTime() - 1000),
      endsAt: new Date(now.getTime() + 60_000)
    });
    const owner = await createUser('Premium quota owner');
    const books = await createBooks(owner.id, 17);

    for (const book of books.slice(0, 16)) await interact(actor.id, book.id);
    await prisma.user.update({
      where: { id: actor.id },
      data: { premiumTrialEndsAt: new Date(Date.now() - 1) }
    });

    await expect(interact(actor.id, books[16].id)).rejects.toMatchObject({ code: 'DAILY_LIKE_LIMIT_REACHED' });
    await expect(prisma.likeDailyUsage.count({ where: { userId: actor.id } })).resolves.toBe(16);
  });

  it('serializes concurrent likes competing for the last free slot', async () => {
    const actor = await createUser('Concurrent quota actor');
    const owner = await createUser('Concurrent quota owner');
    const books = await createBooks(owner.id, 16);

    for (const book of books.slice(0, 14)) await interact(actor.id, book.id);
    const results = await Promise.allSettled([
      interact(actor.id, books[14].id),
      interact(actor.id, books[15].id)
    ]);

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(results.find(result => result.status === 'rejected').reason).toMatchObject({ code: 'DAILY_LIKE_LIMIT_REACHED' });
    await expect(prisma.likeDailyUsage.count({ where: { userId: actor.id } })).resolves.toBe(15);
  });
});
