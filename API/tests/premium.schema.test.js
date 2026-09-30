import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.PREMIUM_TEST_DATABASE_URL;
const expectsBackfillFixture = process.env.PREMIUM_TEST_EXPECT_MIGRATION_BACKFILL === 'true';
const databaseDescribe = databaseUrl ? describe : describe.skip;

databaseDescribe('Premium schema constraints', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;
  let userId;
  let newUserId;
  const migrationActorId = '00000000-0000-4000-8000-000000000001';
  const migrationOwnerId = '00000000-0000-4000-8000-000000000002';
  const migrationInteractionId = 'premium-migration-preserves-interaction';

  beforeAll(async () => {
    if (!prisma) return;
    await prisma.$connect();
    const user = await prisma.user.create({
      data: {
        name: 'Premium schema test',
        email: `premium-${randomUUID()}@example.test`,
        passwordHash: 'test-only-password-hash',
        emailVerifiedAt: new Date(),
        isActive: true
      },
      select: { id: true }
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (newUserId) await prisma.user.deleteMany({ where: { id: newUserId } });
    await prisma.user.deleteMany({ where: { id: { in: [migrationActorId, migrationOwnerId] } } });
    await prisma.$disconnect();
  });

  it.skipIf(!expectsBackfillFixture)('marca contas anteriores como EXISTING e preserva interações durante a migration', async () => {
    const existingUser = await prisma.user.findUnique({
      where: { id: migrationActorId },
      select: { premiumOfferCohort: true, premiumTrialStartedAt: true, premiumTrialEndsAt: true }
    });
    expect(existingUser).toMatchObject({
      premiumOfferCohort: 'EXISTING',
      premiumTrialStartedAt: null,
      premiumTrialEndsAt: null
    });
    await expect(prisma.interaction.findUnique({
      where: { clientActionId: migrationInteractionId },
      select: { actorId: true, action: true }
    })).resolves.toMatchObject({ actorId: migrationActorId, action: 'LIKE' });
  });

  it('atribui NEW por padrão a contas criadas após a migration', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'New premium schema user',
        email: `premium-new-${randomUUID()}@example.test`,
        passwordHash: 'test-only-password-hash',
        emailVerifiedAt: new Date(),
        isActive: true
      },
      select: { id: true, premiumOfferCohort: true }
    });
    newUserId = user.id;
    expect(user.premiumOfferCohort).toBe('NEW');
  });

  it('permite um uso por livro e conta no dia, sem FK para o livro, e libera no dia seguinte', async () => {
    const targetBookId = randomUUID();
    const quotaDate = new Date('2026-09-24T00:00:00.000Z');
    const createUsage = (date) => prisma.likeDailyUsage.create({
      data: { userId, targetBookId, quotaDate: date }
    });

    await createUsage(quotaDate);
    await expect(createUsage(quotaDate)).rejects.toMatchObject({ code: 'P2002' });
    await expect(createUsage(new Date('2026-09-25T00:00:00.000Z'))).resolves.toMatchObject({
      userId,
      targetBookId
    });
  });
});
