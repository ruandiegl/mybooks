import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { createAvatarRepository } from '../src/modules/media/avatar.repository.js';
import { finalAvatarKey } from '../src/modules/media/avatar.keys.js';

const url = process.env.AVATAR_TEST_DATABASE_URL;
if (url && !['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname)) throw new Error('Avatar integration requires a disposable loopback database.');
const integration = url ? describe : describe.skip;
const client = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
const repository = client ? createAvatarRepository(client) : null;
const users = [];
async function fixture() {
  const user = await client.user.create({ data: { name: 'Avatar integration', email: `avatar-${randomUUID()}@example.test`, passwordHash: 'test-only-password-hash', emailVerifiedAt: new Date(), isActive: true, avatarUrl: 'https://legacy.example/photo.jpg' } });
  users.push(user.id);
  return user;
}
async function grant(user, expiresAt = new Date(Date.now() + 300_000)) {
  const id = randomUUID();
  return repository.createGrant(user.id, { id, storageKey: `pending/avatars/${user.id}/${id}.png`, mimeType: 'image/png', size: 100, protocolVersion: 2, expiresAt });
}
integration('avatar grants and version locks with PostgreSQL', () => {
  afterAll(async () => {
    if (users.length) {
      await client.user.deleteMany({ where: { id: { in: users } } });
      for (const id of users) await client.storageCleanupJob.deleteMany({ where: { storageKey: { contains: id } } });
    }
    await client.$disconnect();
  });
  it('allows exactly one claim and makes successful completion idempotent', async () => {
    const user = await fixture(), upload = await grant(user), now = new Date();
    const claims = await Promise.allSettled([repository.claim(user.id, upload.id, now), repository.claim(user.id, upload.id, now)]);
    expect(claims.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(claims.find((x) => x.status === 'rejected').reason.code).toBe('AVATAR_UPLOAD_IN_PROGRESS');
    const updated = await repository.commit(user.id, upload, new Date());
    expect(updated.avatarVersion).toBe(1);
    expect(updated.avatarStorageKey).toBe(finalAvatarKey(user.id, upload.id));
    expect((await repository.claim(user.id, upload.id, new Date())).alreadyCommitted).toBe(true);
  });
  it('permits only one of two different uploads to replace the same version', async () => {
    const user = await fixture(), first = await grant(user), second = await grant(user);
    await repository.claim(user.id, first.id, new Date());
    await repository.claim(user.id, second.id, new Date());
    const results = await Promise.allSettled([repository.commit(user.id, first, new Date()), repository.commit(user.id, second, new Date())]);
    expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((x) => x.status === 'rejected').reason.code).toBe('AVATAR_UPLOAD_SUPERSEDED');
    expect((await client.user.findUnique({ where: { id: user.id } })).avatarVersion).toBe(1);
  });
  it('fences removal against an in-flight completion and preserves idempotent delete', async () => {
    const user = await fixture(), upload = await grant(user);
    await repository.claim(user.id, upload.id, new Date());
    const removed = await repository.remove(user.id);
    await expect(repository.commit(user.id, upload, new Date())).rejects.toMatchObject({ code: 'AVATAR_UPLOAD_EXPIRED' });
    expect((await repository.remove(user.id)).avatarVersion).toBe(removed.avatarVersion);
    const current = await client.user.findUnique({ where: { id: user.id } });
    expect(current.avatarStorageKey).toBeNull();
    expect(current.avatarUrl).toBeNull();
    expect(await client.storageCleanupJob.count({ where: { storageKey: upload.storageKey } })).toBe(1);
  });
  it('rejects foreign or expired grants and schedules abandoned-object cleanup', async () => {
    const user = await fixture(), other = await fixture(), upload = await grant(user, new Date(Date.now() - 1000));
    await expect(repository.claim(other.id, upload.id, new Date())).rejects.toMatchObject({ code: 'AVATAR_KEY_FORBIDDEN' });
    await expect(repository.claim(user.id, upload.id, new Date())).rejects.toMatchObject({ code: 'AVATAR_UPLOAD_EXPIRED' });
    await repository.sweepExpired();
    expect((await client.avatarUpload.findUnique({ where: { id: upload.id } })).status).toBe('EXPIRED');
    expect(await client.storageCleanupJob.count({ where: { storageKey: upload.storageKey } })).toBe(1);
  });
});
