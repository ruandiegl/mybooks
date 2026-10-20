import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { disposableDatabaseUrl } from '../vitest.integration.config.js';

const migrationName = '20261020120000_match_exchange_books_and_interaction_receipts';
const migrationsRoot = new URL('../prisma/migrations/', import.meta.url);
const databaseUrl = disposableDatabaseUrl();
const ids = {
  userA: randomUUID(), userB: randomUUID(), bookA: randomUUID(), bookB: randomUUID(),
  match: randomUUID(), conversation: randomUUID(), message: randomUUID(),
  like: randomUUID(), pass: randomUUID()
};
let admin;
let db;
let schema;
let schemaCreated = false;

async function applyMigration(name) {
  const sql = await readFile(new URL(`${name}/migration.sql`, migrationsRoot), 'utf8');
  // The historical migrations contain simple SQL statements and one public-qualified FK.
  // Keep every statement within the isolated schema rather than touching public.
  const statements = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
    .replaceAll('"public".', '').split(';').map((statement) => statement.trim()).filter(Boolean);
  await db.$transaction(async (tx) => {
    for (const statement of statements) await tx.$executeRawUnsafe(statement);
  }, { timeout: 60000 });
}

beforeEach(async () => {
  schema = `migration_test_${randomUUID().replaceAll('-', '')}`;
  admin = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  const scopedUrl = new URL(databaseUrl);
  scopedUrl.searchParams.set('schema', schema);
  db = new PrismaClient({ datasources: { db: { url: scopedUrl.toString() } } });
  const [context] = await db.$queryRaw`SELECT current_schema() AS "schema"`;
  expect(context.schema).toBe(schema);
  const previous = (await readdir(migrationsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name < migrationName)
    .map((entry) => entry.name).sort();
  for (const name of previous) await applyMigration(name);

  await db.$executeRaw`INSERT INTO "User" ("id", "name", "clerkUserId") VALUES
    (${ids.userA}, 'Reader A', ${`test:${ids.userA}`}), (${ids.userB}, 'Reader B', ${`test:${ids.userB}`})`;
  await db.$executeRaw`INSERT INTO "Book" ("id", "title", "user_id", "updatedAt") VALUES
    (${ids.bookA}, 'Book A', ${ids.userA}, CURRENT_TIMESTAMP), (${ids.bookB}, 'Book B', ${ids.userB}, CURRENT_TIMESTAMP)`;
  await db.$executeRaw`INSERT INTO "Interaction" ("id", "actorId", "targetBookId", "action", "clientActionId", "createdAt", "updatedAt") VALUES
    (${randomUUID()}, ${ids.userA}, ${ids.bookB}, 'LIKE', ${ids.like}, '2026-10-01T12:00:00Z', CURRENT_TIMESTAMP),
    (${randomUUID()}, ${ids.userB}, ${ids.bookA}, 'PASS', ${ids.pass}, '2026-10-02T12:00:00Z', CURRENT_TIMESTAMP)`;
  await db.$executeRaw`INSERT INTO "Match" ("id", "userAId", "userBId", "updatedAt") VALUES
    (${ids.match}, ${ids.userA}, ${ids.userB}, CURRENT_TIMESTAMP)`;
  await db.$executeRaw`INSERT INTO "Conversation" ("id", "matchId", "updatedAt") VALUES
    (${ids.conversation}, ${ids.match}, CURRENT_TIMESTAMP)`;
  await db.$executeRaw`INSERT INTO "ConversationMember" ("conversationId", "userId") VALUES
    (${ids.conversation}, ${ids.userA}), (${ids.conversation}, ${ids.userB})`;
  await db.$executeRaw`INSERT INTO "Message" ("id", "conversationId", "senderId", "clientMessageId", "body", "updatedAt") VALUES
    (${ids.message}, ${ids.conversation}, ${ids.userA}, ${randomUUID()}, 'Hello', CURRENT_TIMESTAMP)`;
  await applyMigration(migrationName);
});

afterEach(async () => {
  try {
    await db?.$disconnect();
    if (schemaCreated) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    schemaCreated = false;
    await admin?.$disconnect();
    db = undefined;
    admin = undefined;
  }
});

describe('exchange books and interaction receipts migration', () => {
  it('backfills existing interaction ids', async () => {
    const receipts = await db.interactionActionReceipt.findMany({ orderBy: { createdAt: 'asc' } });
    expect(receipts).toEqual([
      { clientActionId: ids.like, actorId: ids.userA, targetBookId: ids.bookB, action: 'LIKE', createdAt: new Date('2026-10-01T12:00:00Z') },
      { clientActionId: ids.pass, actorId: ids.userB, targetBookId: ids.bookA, action: 'PASS', createdAt: new Date('2026-10-02T12:00:00Z') }
    ]);
    await expect(db.interactionActionReceipt.create({ data: {
      clientActionId: ids.like, actorId: ids.userB, targetBookId: ids.bookA, action: 'PASS'
    } })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('keeps legacy matches without inferred books', async () => {
    const match = await db.match.findUnique({ where: { id: ids.match } });
    expect(match).toMatchObject({ userAId: ids.userA, userBId: ids.userB, bookAId: null, bookBId: null });
    expect(await db.conversation.count()).toBe(1);
  });

  it.each(['A', 'B'])('sets book reference null on delete (%s)', async (side) => {
    await db.match.update({ where: { id: ids.match }, data: { bookAId: ids.bookA, bookBId: ids.bookB } });
    await db.book.delete({ where: { id: ids[`book${side}`] } });
    expect(await db.match.findUnique({ where: { id: ids.match } })).toMatchObject({
      bookAId: side === 'A' ? null : ids.bookA,
      bookBId: side === 'B' ? null : ids.bookB
    });
    expect(await db.conversation.count()).toBe(1);
    expect(await db.message.count()).toBe(1);
    expect(await db.interactionActionReceipt.count()).toBe(1);
  });

  it('preserves receipts after match deletion', async () => {
    await db.interaction.updateMany({ data: { action: 'PASS' } });
    await db.match.delete({ where: { id: ids.match } });
    expect(await db.conversation.count()).toBe(0);
    expect(await db.conversationMember.count()).toBe(0);
    expect(await db.message.count()).toBe(0);
    expect(await db.interactionActionReceipt.findUnique({ where: { clientActionId: ids.like } }))
      .toMatchObject({ action: 'LIKE', actorId: ids.userA, targetBookId: ids.bookB });
    expect(await db.interactionActionReceipt.count()).toBe(2);
  });

  it('cascades actor deletion to receipts', async () => {
    await db.user.delete({ where: { id: ids.userA } });
    expect(await db.interactionActionReceipt.count()).toBe(0);
  });
});
