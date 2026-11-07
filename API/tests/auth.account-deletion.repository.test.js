import { describe, expect, it, vi } from 'vitest';
import { createAuthRepository } from '../src/modules/auth/auth.repository.js';

const userId = 'user-1', sessionId = 'session-1';
function fixture(passwordHash = 'saved-hash') {
  const calls = [];
  const tx = {
    $queryRaw: vi.fn(async () => [{ id: userId }]),
    user: {
      findUnique: vi.fn(async () => ({ id: userId, isActive: true, emailVerifiedAt: new Date(), passwordHash })),
      findMany: vi.fn(async () => [{ id: userId, avatarStorageKey: 'avatars/user-1/current.webp', avatarVersion: 1, avatarUrl: null }]),
      delete: vi.fn(async () => { calls.push('delete'); })
    },
    authSession: {
      findUnique: vi.fn(async () => ({ id: sessionId, userId, familyId: 'family-1', revokedAt: null, expiresAt: new Date(Date.now() + 3600000) })),
      findMany: vi.fn(async () => [{ id: sessionId }])
    },
    match: { findMany: vi.fn(async () => [{ id: 'match-1', userAId: userId, userBId: 'other', conversation: { id: 'conversation-1' } }]) },
    bookImage: { findMany: vi.fn(async () => [{ storageKey: 'books/user-1/book-1.webp' }]) },
    avatarUpload: { findMany: vi.fn(async () => []) },
    storageCleanupJob: { upsert: vi.fn(async () => { calls.push('cleanup'); }) }
  };
  return { repository: createAuthRepository({ $transaction: (callback) => callback(tx) }), tx, calls };
}

describe('account deletion transaction', () => {
  it('queues media cleanup before deleting the user and records affected matches', async () => {
    const { repository, tx, calls } = fixture();
    const result = await repository.deleteAccountAndSessions({ userId, sessionId, expectedPasswordHash: 'saved-hash' });
    expect(result).toEqual({ status: 'DELETED', userId, sessionIds: [sessionId], removedMatches: [{ matchId: 'match-1', conversationId: 'conversation-1', otherUserId: 'other' }] });
    expect(tx.storageCleanupJob.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { storageKey: 'books/user-1/book-1.webp' } }));
    expect(tx.storageCleanupJob.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { storageKey: 'avatars/user-1/current.webp' } }));
    expect(calls).toEqual(['cleanup', 'cleanup', 'delete']);
  });
  it('does not delete when the password proof is stale', async () => {
    const { repository, tx } = fixture('new-hash');
    expect(await repository.deleteAccountAndSessions({ userId, sessionId, expectedPasswordHash: 'old-hash' })).toEqual({ status: 'CHANGED_SESSION' });
    expect(tx.user.delete).not.toHaveBeenCalled();
    expect(tx.storageCleanupJob.upsert).not.toHaveBeenCalled();
  });
});
