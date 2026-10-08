import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { createSettingsRepository } from '../src/modules/settings/settings.repository.js';
const url = process.env.SETTINGS_TEST_DATABASE_URL;
if (url && (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith('/plan010_test'))) throw Error('Settings tests require disposable loopback plan010_test DB.');
const integration = url ? describe : describe.skip;
const client = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
const ids = [];
integration('UserPreferences with PostgreSQL', () => {
  afterAll(async () => { await client.user.deleteMany({ where: { id: { in: ids } } }); await client.$disconnect(); });
  it('upserts one row, survives a new connection, isolates owners and cascades on deletion', async () => {
    const a = await client.user.create({ data: { name: 'Fixture A', email: `settings-${randomUUID()}@example.test` } }); ids.push(a.id);
    const b = await client.user.create({ data: { name: 'Fixture B', email: `settings-${randomUUID()}@example.test` } }); ids.push(b.id);
    const repository = createSettingsRepository(client);
    expect(await repository.find(a.id)).toBeNull();
    await repository.upsert(a.id, { showLikesBadge: false });
    await repository.upsert(a.id, { showLikesBadge: false });
    expect(await client.userPreferences.count({ where: { userId: a.id } })).toBe(1);
    expect(await repository.find(b.id)).toBeNull();
    const reader = new PrismaClient({ datasources: { db: { url } } });
    try { expect((await createSettingsRepository(reader).find(a.id)).showLikesBadge).toBe(false); } finally { await reader.$disconnect(); }
    await client.user.delete({ where: { id: a.id } });
    expect(await repository.find(a.id)).toBeNull();
  });
});
