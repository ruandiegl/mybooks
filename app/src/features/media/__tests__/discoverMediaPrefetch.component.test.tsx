// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => await import('react-native-web'));
import { useDiscoverMediaPrefetch } from '../useDiscoverMediaPrefetch';
import { disposeMediaScope } from '../mediaPrefetch';
import type { Book } from '../../../types/api';
const scope = { userId: 'viewer', epoch: 1 };
const getScope = () => scope;
let images: HTMLImageElement[];
let visible = true;
const books = [0, 1, 2, 3].map(index => ({ id: 'book' + index, title: 'Livro', images: [{ id: 'photo' + index, url: 'https://fixture.invalid/book' + index, expiresAt: null, sortOrder: 0, isCover: true }], owner: { id: 'owner' + index, avatarUrl: 'https://fixture.invalid/avatar' + index, avatarVersion: 1, avatarUrlExpiresAt: null } })) as unknown as Book[];
beforeEach(() => {
  visible = true;
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visible ? 'visible' : 'hidden' });
  images = [];
  vi.stubGlobal('Image', function () { const image = document.createElement('img'); image.decode = async () => {}; images.push(image); return image; });
});
afterEach(async () => { cleanup(); await disposeMediaScope(scope); vi.unstubAllGlobals(); });
const flush = async () => { await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); }); };
it('warms only covers and avatars of the two books following the visible one', async () => {
  renderHook(() => useDiscoverMediaPrefetch({ books, focused: true, scope, getScope })); await flush();
  expect(images.map(image => image.src)).toEqual(['https://fixture.invalid/book1', 'https://fixture.invalid/avatar1', 'https://fixture.invalid/book2', 'https://fixture.invalid/avatar2']);
});
it('does not prepare media while the discovery tab is unfocused', async () => {
  const hook = renderHook(({ focused }) => useDiscoverMediaPrefetch({ books, focused, scope, getScope }), { initialProps: { focused: false } });
  await flush(); expect(images).toHaveLength(0);
  hook.rerender({ focused: true }); await flush(); expect(images).toHaveLength(4);
});
it('cancels the pending window when the PWA goes into the background', async () => {
  const complete: Array<() => void> = [];
  vi.stubGlobal('Image', function () { const image = document.createElement('img'); image.decode = () => new Promise<void>(resolve => complete.push(resolve)); images.push(image); return image; });
  renderHook(() => useDiscoverMediaPrefetch({ books, focused: true, scope, getScope }));
  expect(images).toHaveLength(2);
  visible = false; act(() => document.dispatchEvent(new Event('visibilitychange')));
  await act(async () => { complete[0](); complete[1](); });
  await flush(); expect(images).toHaveLength(2);
});
