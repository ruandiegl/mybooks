import { describe, expect, it } from 'vitest';
import { ownedLegacyAvatarKey } from '../src/modules/media/avatar.keys.js';
const userId = '10000000-0000-4000-8000-000000000001';
const imageId = '30000000-0000-4000-8000-000000000003';
describe('legacy avatar cleanup ownership', () => {
  it('accepts only the configured public origin and the exact owner path', () => {
    const path = `avatars/${userId}/${imageId}.jpg`;
    expect(ownedLegacyAvatarKey({ id: userId, avatarUrl: 'https://cdn.example/' + path }, 'https://cdn.example')).toBe(path);
    for (const url of [
      'https://foreign.example/' + path,
      'https://cdn.example/avatars/other-user/' + imageId + '.jpg',
      'https://cdn.example/' + path + '?token=unexpected',
      'https://cdn.example/prefix/' + path
    ]) expect(ownedLegacyAvatarKey({ id: userId, avatarUrl: url }, 'https://cdn.example')).toBeNull();
  });
});
