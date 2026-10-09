// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => await import('react-native-web'));
vi.mock('expo-image', () => ({ Image: ({ source, cachePolicy, onDisplay, onError, style }: any) => <img src={source.uri} data-cache={cachePolicy} onLoad={onDisplay} onError={onError} style={{ opacity: Array.isArray(style) ? style.at(-1)?.opacity : 1 }} /> }));
import { RemoteMediaImage } from '../../../components/RemoteMediaImage';
const scope = { userId: 'a', epoch: 1 };
const props = { media: { identity: 'one', url: 'https://fixture.invalid/one', expiresAt: null }, scope, getScope: () => scope, pixelBucket: 256, fit: 'contain' as const, transitionMs: 0 as const };
afterEach(cleanup);
describe('native image bridge ownership', () => {
  it('promotes the same decoded layer without remounting or disk caching', () => {
    const mounted = render(<RemoteMediaImage {...props} />);
    const original = mounted.container.querySelector('img')!;
    act(() => fireEvent.load(original));
    expect(mounted.container.querySelector('img')).toBe(original);
    expect(original.dataset.cache).toBe('memory');
    mounted.rerender(<RemoteMediaImage {...props} media={{ ...props.media, url: 'https://fixture.invalid/new-signature' }} />);
    expect(mounted.container.querySelector('img')).toBe(original);
    expect(original.getAttribute('src')).toBe('https://fixture.invalid/one');
  });
  it('settles each display attempt once even if the bridge reports it twice', () => {
    let count = 0;
    const mounted = render(<RemoteMediaImage {...props} onReady={() => count++} />);
    const image = mounted.container.querySelector('img')!;
    act(() => { fireEvent.load(image); fireEvent.load(image); });
    expect(count).toBe(1);
  });
  it('keeps the decoded layer on a failed retry and clears it for different content', () => {
    const mounted = render(<RemoteMediaImage {...props} />);
    act(() => fireEvent.load(mounted.container.querySelector('img')!));
    const first = mounted.container.querySelector('img')!;
    mounted.rerender(<RemoteMediaImage {...props} retryToken={1} />);
    const pending = mounted.container.querySelectorAll('img')[1];
    act(() => fireEvent.error(pending));
    expect(mounted.container.querySelector('img')).toBe(first);
    mounted.rerender(<RemoteMediaImage {...props} media={{ ...props.media, identity: 'other', url: 'https://fixture.invalid/two' }} />);
    expect(mounted.container.contains(first)).toBe(false);
  });
});
