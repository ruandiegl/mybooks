import { describe, expect, it } from 'vitest';
import { createAvatarMedia, createBookMedia, getMediaPixelBucket } from '../mediaIdentity';

const scope = { userId: 'viewer', epoch: 1 };
describe('media content identity', () => {
  it('keeps identity when only a private signature changes', () => {
    const first = createBookMedia(scope, 'book1', { id: 'photo1', url: 'https://fixture.invalid/1?sig=a' });
    const renewed = createBookMedia(scope, 'book1', { id: 'photo1', url: 'https://fixture.invalid/1?sig=b' });
    expect(first?.identity).toBe('["viewer",1,"book","book1","photo1"]');
    expect(renewed?.identity).toBe('["viewer",1,"book","book1","photo1"]');
    expect(renewed?.url).toBe('https://fixture.invalid/1?sig=b');
  });
  it('changes identity for reordered covers and isolates books', () => {
    expect(createBookMedia(scope, 'book1', { id: 'photo2', url: 'two' })?.identity).toBe('["viewer",1,"book","book1","photo2"]');
    expect(createBookMedia(scope, 'book2', { id: 'photo2', url: 'two' })?.identity).toBe('["viewer",1,"book","book2","photo2"]');
  });
  it('isolates avatar subjects, versions and epochs even with a missing grant', () => {
    expect(createAvatarMedia(scope, 'reader', { avatarVersion: 2, avatarUrl: null })?.identity).toBe('["viewer",1,"avatar","reader",2]');
    expect(createAvatarMedia({ userId: 'viewer', epoch: 2 }, 'reader', { avatarVersion: 2 })?.identity).toBe('["viewer",2,"avatar","reader",2]');
    expect(createAvatarMedia(scope, 'reader2', { avatarVersion: 3 })?.identity).toBe('["viewer",1,"avatar","reader2",3]');
  });
  it('namespaces external covers and preserves selecting query parameters', () => {
    expect(createBookMedia(scope, 'one', { id: 'external-cover', url: 'https://fixture.invalid/image?page=2' })?.identity).toBe('["viewer",1,"book","one","https://fixture.invalid/image?page=2"]');
    expect(createBookMedia(scope, 'two', { url: 'https://fixture.invalid/image?page=1' })?.identity).toBe('["viewer",1,"book","two","https://fixture.invalid/image?page=1"]');
    expect(createBookMedia(scope, 'one', { url: null })).toBeNull();
    expect(createAvatarMedia(scope, 'reader', { avatarUrl: 'external' })?.identity).toBe('["viewer",1,"avatar","reader","external"]');
    expect(createAvatarMedia(scope, 'reader', {})).toBeNull();
  });
  it('bounds preparation sizes independently from content identity', () => {
    expect(getMediaPixelBucket(44, 3)).toBe(256);
    expect(getMediaPixelBucket(512, 3)).toBe(1536);
    expect(getMediaPixelBucket(2000, 3)).toBe(1536);
    expect(getMediaPixelBucket(0, 0)).toBe(128);
  });
});
