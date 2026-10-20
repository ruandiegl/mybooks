import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { disposableDatabaseUrl } from '../vitest.integration.config.js';

// This is a real Prisma client bound only to a fresh schema in the guarded test DB.
// The production singleton and its application DATABASE_URL are never imported.
const state = vi.hoisted(() => ({ db: null }));
vi.mock('../src/shared/database/prisma.js', () => ({ get prisma() { return state.db; } }));
const { matchesRepository } = await import('../src/modules/matches/matches.repository.js');
const { chatService } = await import('../src/modules/chat/chat.service.js');
const databaseUrl = disposableDatabaseUrl();
const migrationsRoot = new URL('../prisma/migrations/', import.meta.url);
let admin;
let schema;
let schemaCreated = false;
let users;
let books;
const like = (actorId, targetBookId, clientActionId = randomUUID()) => ({ actorId, targetBookId, action: 'LIKE', clientActionId });

beforeEach(async () => {
  schema = `matches_test_${randomUUID().replaceAll('-', '')}`;
  admin = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  const url = new URL(databaseUrl);
  url.searchParams.set('schema', schema);
  state.db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const [context] = await state.db.$queryRaw`SELECT current_schema() AS "schema"`;
  expect(context.schema).toBe(schema);
  const names = (await readdir(migrationsRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  for (const name of names) {
    const sql = await readFile(new URL(`${name}/migration.sql`, migrationsRoot), 'utf8');
    const statements = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').replaceAll('"public".', '').split(';').map((part) => part.trim()).filter(Boolean);
    await state.db.$transaction(async (tx) => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
    }, { timeout: 60000 });
  }
  users = [randomUUID(), randomUUID(), randomUUID()].sort();
  books = [randomUUID(), randomUUID(), randomUUID()];
  await state.db.user.createMany({ data: users.map((id) => ({ id, name: 'Reader', clerkUserId: `test:${id}` })) });
  await state.db.book.createMany({ data: books.map((id, index) => ({ id, title: `Book ${index}`, ownerId: users[index] })) });
});

afterEach(async () => {
  try {
    await state.db?.$disconnect();
    if (schemaCreated) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    schemaCreated = false;
    state.db = null;
    await admin?.$disconnect();
  }
});

async function connect(first = 0, second = 1) {
  const firstAction = like(users[first], books[second]);
  const secondAction = like(users[second], books[first]);
  await matchesRepository.applyInteraction(firstAction);
  const { match } = await matchesRepository.applyInteraction(secondAction);
  return { match, actions: [firstAction, secondAction] };
}

describe('atomic match lifecycle against disposable PostgreSQL', () => {
  it('captures canonical original books and keeps them when further books are liked', async () => {
    const { match } = await connect();
    expect(match).toMatchObject({ userAId: users[0], userBId: users[1], bookAId: books[0], bookBId: books[1] });
    const extra = await state.db.book.create({ data: { title: 'Extra', ownerId: users[1] } });
    const result = await matchesRepository.applyInteraction(like(users[0], extra.id));
    expect(result.match).toMatchObject({ id: match.id, bookAId: books[0], bookBId: books[1] });
  });

  it('replays an active match after the original target book becomes unavailable', async () => {
    const { match, actions } = await connect();
    const action = actions[1];
    await state.db.book.update({ where: { id: action.targetBookId }, data: { availability: 'EXCHANGED' } });

    const replay = await matchesRepository.applyInteraction(action);

    expect(replay.interaction).toMatchObject({ clientActionId: action.clientActionId, action: 'LIKE' });
    expect(replay.match).toMatchObject({ id: match.id, status: 'ACTIVE' });
  });

  it('retains old receipts over multiple removal cycles and requires new reciprocal likes', async () => {
    const oldest = [];
    for (let cycle = 0; cycle < 3; cycle++) {
      const { match, actions } = await connect();
      oldest.push(...actions);
      await chatService.sendMessage(users[0], match.conversation.id, { clientMessageId: randomUUID(), body: 'Hello' });
      await matchesRepository.remove(users[1], match.id);
      expect(await state.db.match.count()).toBe(0);
      expect(await state.db.conversation.count()).toBe(0);
      expect(await state.db.conversationMember.count()).toBe(0);
      expect(await state.db.message.count()).toBe(0);
      for (const action of oldest) {
        const replay = await matchesRepository.applyInteraction(action);
        expect(replay.match).toBeNull();
        expect(replay.interaction.action).toBe('PASS');
      }
      expect(await state.db.interaction.count({ where: { action: 'LIKE' } })).toBe(0);
      expect(await state.db.interactionActionReceipt.count()).toBe((cycle + 1) * 2);
    }
    const first = await matchesRepository.applyInteraction(like(users[0], books[1]));
    expect(first.match).toBeNull();
    expect((await matchesRepository.applyInteraction(like(users[1], books[0]))).match).not.toBeNull();
  });

  it('rejects receipt scope changes and rolls back without mutating interactions', async () => {
    const action = like(users[0], books[1]);
    await matchesRepository.applyInteraction(action);
    for (const change of [{ actorId: users[2] }, { targetBookId: books[2] }, { action: 'PASS' }]) {
      await expect(matchesRepository.applyInteraction({ ...action, ...change })).rejects.toMatchObject({ code: 'ACTION_ID_CONFLICT' });
    }
    expect(await state.db.interactionActionReceipt.count()).toBe(1);
    expect(await state.db.interaction.count({ where: { action: 'LIKE' } })).toBe(1);
  });

  it('returns indistinguishable 404s for outsiders and missing matches while preserving other pairs', async () => {
    const { match } = await connect();
    const { match: other } = await connect(0, 2);
    await expect(matchesRepository.remove(users[2], match.id)).rejects.toMatchObject({ code: 'MATCH_NOT_FOUND', statusCode: 404 });
    await expect(matchesRepository.remove(users[0], randomUUID())).rejects.toMatchObject({ code: 'MATCH_NOT_FOUND', statusCode: 404 });
    await matchesRepository.remove(users[0], match.id);
    expect(await state.db.match.findUnique({ where: { id: other.id } })).not.toBeNull();
    expect(await state.db.conversation.findUnique({ where: { id: other.conversation.id } })).not.toBeNull();
    expect(await state.db.interaction.count({ where: { action: 'LIKE' } })).toBe(2);
  });

  it('does not restore a match during concurrent removal, a new like and message sending', async () => {
    const { match, actions } = await connect();
    const database = state.db;
    let transactionsStarted = 0;
    let releaseStartBarrier;
    const startBarrier = new Promise((resolve) => { releaseStartBarrier = resolve; });
    state.db = new Proxy(database, {
      get(target, property) {
        if (property === '$transaction') {
          return (operation, options) => target.$transaction(async (tx) => {
            transactionsStarted += 1;
            if (transactionsStarted === 3) releaseStartBarrier();
            await startBarrier;
            return operation(tx);
          }, options);
        }
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
    let outcomes;
    try {
      outcomes = await Promise.allSettled([
        matchesRepository.remove(users[0], match.id),
        matchesRepository.applyInteraction(like(users[0], books[1])),
        chatService.sendMessage(users[1], match.conversation.id, { clientMessageId: randomUUID(), body: 'Racing' })
      ]);
    } finally {
      state.db = database;
    }
    expect(outcomes[0].status).toBe('fulfilled');
    for (const outcome of outcomes.slice(1)) {
      if (outcome.status === 'rejected') expect(['CONVERSATION_NOT_FOUND', 'MESSAGE_RETRY_REQUIRED', 'INTERACTION_RETRY_REQUIRED']).toContain(outcome.reason.code);
    }
    expect(await state.db.match.count()).toBe(0);
    expect(await state.db.conversation.count()).toBe(0);
    expect(await state.db.message.count()).toBe(0);
    expect(await state.db.interaction.count({ where: { action: 'LIKE' } })).toBeLessThanOrEqual(1);
    // Old IDs cannot provide the missing reverse like after the race.
    for (const action of actions) expect((await matchesRepository.applyInteraction(action)).match).toBeNull();
    expect(await state.db.match.count()).toBe(0);
    await expect(chatService.sendMessage(users[1], match.conversation.id, { clientMessageId: randomUUID(), body: 'Too late' }))
      .rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND', statusCode: 404 });
    await expect(chatService.markRead(users[1], match.conversation.id)).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
    await expect(chatService.assertMember(match.conversation.id, users[1])).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
  });
});
