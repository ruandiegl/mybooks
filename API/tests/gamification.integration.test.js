import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { disposableDatabaseUrl } from '../vitest.integration.config.js';

const state = vi.hoisted(() => ({ db: null }));
vi.mock('../src/shared/database/prisma.js', () => ({ get prisma() { return state.db; } }));

const { gamificationRepository } = await import('../src/modules/gamification/gamification.repository.js');
const migrationName = '20261026120000_daily_active_streak';
const migrationsRoot = new URL('../prisma/migrations/', import.meta.url);
const databaseUrl = disposableDatabaseUrl();
let admin;
let db;
let schema;
let schemaCreated = false;
let legacyUserId;

async function applyMigration(name) {
  const sql = await readFile(new URL(`${name}/migration.sql`, migrationsRoot), 'utf8');
  const statements = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
    .replaceAll('"public".', '').split(';').map((statement) => statement.trim()).filter(Boolean);
  await db.$transaction(async (tx) => {
    for (const statement of statements) await tx.$executeRawUnsafe(statement);
  }, { timeout: 60000 });
}

async function createUser({ name = 'Reader', streak = null, day = null } = {}) {
  const id = randomUUID();
  await db.user.create({
    data: {
      id,
      name,
      clerkUserId: `test:${id}`,
      ...(streak === null ? {} : { currentActiveStreak: streak }),
      ...(day === null ? {} : { lastActiveDay: new Date(`${day}T00:00:00.000Z`) })
    }
  });
  return id;
}

function clockAt(day) {
  return () => new Date(`${day}T12:00:00.000Z`);
}

beforeEach(async () => {
  schema = `gamification_test_${randomUUID().replaceAll('-', '')}`;
  admin = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  const scopedUrl = new URL(databaseUrl);
  scopedUrl.searchParams.set('schema', schema);
  db = new PrismaClient({ datasources: { db: { url: scopedUrl.toString() } } });
  state.db = db;
  const [context] = await db.$queryRaw`SELECT current_schema() AS "schema"`;
  expect(context.schema).toBe(schema);

  const previous = (await readdir(migrationsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name < migrationName)
    .map((entry) => entry.name).sort();
  for (const name of previous) await applyMigration(name);

  legacyUserId = randomUUID();
  await db.$executeRaw`INSERT INTO "User" ("id", "name", "clerkUserId") VALUES
    (${legacyUserId}, 'Legacy Reader', ${`test:${legacyUserId}`})`;
  await applyMigration(migrationName);
});

afterEach(async () => {
  try {
    await db?.$disconnect();
    if (schemaCreated) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    schemaCreated = false;
    state.db = null;
    await admin?.$disconnect();
  }
});

describe('daily streak persistence against disposable PostgreSQL', () => {
  it('leaves existing accounts without an invented activity history', async () => {
    const legacy = await db.user.findUnique({
      where: { id: legacyUserId },
      select: { lastActiveDay: true, currentActiveStreak: true }
    });
    expect(legacy).toEqual({ lastActiveDay: null, currentActiveStreak: null });
  });

  it('starts a legacy account at one on its first check-in', async () => {
    await expect(gamificationRepository.recordCheckIn(legacyUserId, clockAt('2026-10-26')))
      .resolves.toEqual({ dayKey: '2026-10-26', currentStreak: 1, checkedInToday: true });
  });

  it('serializes concurrent check-ins for one user and day', async () => {
    const results = await Promise.all([
      gamificationRepository.recordCheckIn(legacyUserId, clockAt('2026-10-26')),
      gamificationRepository.recordCheckIn(legacyUserId, clockAt('2026-10-26'))
    ]);
    expect(results.map(({ currentStreak }) => currentStreak)).toEqual([1, 1]);
    expect(await db.user.findUnique({ where: { id: legacyUserId }, select: { currentActiveStreak: true } }))
      .toEqual({ currentActiveStreak: 1 });
  });

  it('increments consecutive days and resets after a missed day', async () => {
    await gamificationRepository.recordCheckIn(legacyUserId, clockAt('2026-10-26'));
    await expect(gamificationRepository.recordCheckIn(legacyUserId, clockAt('2026-10-27')))
      .resolves.toMatchObject({ currentStreak: 2 });
    await expect(gamificationRepository.recordCheckIn(legacyUserId, clockAt('2026-10-29')))
      .resolves.toMatchObject({ currentStreak: 1 });
  });

  it('includes all participants tied at rank 20 and returns the current user rank outside the list', async () => {
    const day = '2026-10-26';
    for (let streak = 100; streak >= 82; streak -= 1) {
      await createUser({ name: `Reader ${streak}`, streak, day });
    }
    for (let index = 1; index <= 3; index += 1) {
      await createUser({ name: `Tied Reader ${index}`, streak: 10, day });
    }
    await db.user.update({ where: { id: legacyUserId }, data: { currentActiveStreak: 1, lastActiveDay: new Date(`${day}T00:00:00.000Z`) } });
    await createUser({ name: 'Expired high streak', streak: 999, day: '2026-10-24' });
    await createUser({ name: 'Future high streak', streak: 998, day: '2026-10-27' });
    await createUser({ name: 'Zero streak', streak: 0, day });

    const result = await gamificationRepository.listLeaderboard({ currentUserId: legacyUserId, today: day });

    expect(result.currentUser).toEqual({ currentStreak: 1, rank: 23 });
    expect(result.entries).toHaveLength(22);
    expect(result.entries.filter(({ rank }) => rank === 20)).toHaveLength(3);
    expect(result.entries.at(-1)).toMatchObject({ currentStreak: 10, rank: 20 });
    expect(JSON.stringify(result)).not.toMatch(/Expired high streak|Future high streak|Zero streak|email|phone|lastActiveDay/i);
  });
});
