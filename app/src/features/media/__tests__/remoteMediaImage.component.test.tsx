// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => await import('react-native-web'));
import { RemoteMediaImage } from '../../../components/RemoteMediaImage/index.web';

let requests: Array<{ image: HTMLImageElement; resolve: () => void; reject: () => void }>;
const scope = { userId: 'viewer', epoch: 1 };
let actor = scope;
const getScope = () => actor;
const media = { identity: 'photo1', url: 'https://fixture.invalid/one?sig=1', expiresAt: null };
const props = { media, scope, getScope, pixelBucket: 256, fit: 'contain' as const, transitionMs: 120 as const, style: { width: 100, height: 100 }, accessibilityLabel: 'Capa' };
beforeEach(() => {
  actor = scope; requests = [];
  vi.stubGlobal('Image', function () {
    const image = document.createElement('img');
    let resolve!: () => void, reject!: () => void;
    image.decode = () => new Promise<void>((success, fail) => { resolve = success; reject = () => fail(new Error('decode unavailable')); });
    requests.push({ image, resolve: () => resolve(), reject: () => reject() });
    return image;
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Web media frame continuity', () => {
  it('does not replace a ready frame on load while decode is still pending', async () => {
    const mounted = render(<RemoteMediaImage {...props} />);
    await act(async () => requests[0].resolve());
    const first = mounted.container.querySelector('img');
    mounted.rerender(<RemoteMediaImage {...props} retryToken={1} media={{ ...media, url: 'https://fixture.invalid/new' }} />);
    act(() => fireEvent.load(requests[1].image));
    expect(mounted.container.querySelector('img')).toBe(first);
    await act(async () => requests[1].resolve());
    expect(mounted.container.querySelector('img')?.getAttribute('src')).toBe('https://fixture.invalid/new');
  });
  it('does not start a cold download using a known expired grant', async () => {
    let refresh = 0;
    render(<RemoteMediaImage {...props} media={{ ...media, expiresAt: '2000-01-01T00:00:00Z' }} onError={() => refresh++} />);
    await act(async () => {});
    expect(requests).toHaveLength(0);
    expect(refresh).toBe(1);
  });
  it('keeps the decoded DOM frame through twenty refetches and missing signatures', async () => {
    const mounted = render(<RemoteMediaImage {...props} />);
    await act(async () => requests[0].resolve());
    const frame = mounted.container.querySelector('img');
    expect(frame?.getAttribute('src')).toBe('https://fixture.invalid/one?sig=1');
    for (let index = 2; index < 22; index++) mounted.rerender(<RemoteMediaImage {...props} media={{ ...media, url: 'https://fixture.invalid/one?sig=' + index }} />);
    mounted.rerender(<RemoteMediaImage {...props} media={{ ...media, url: null }} />);
    expect(mounted.container.querySelector('img')).toBe(frame);
    expect(requests).toHaveLength(1);
  });
  it('clears old content synchronously and ignores old decode completions', async () => {
    const mounted = render(<RemoteMediaImage {...props} />);
    mounted.rerender(<RemoteMediaImage {...props} media={{ ...media, identity: 'photo2', url: 'https://fixture.invalid/two' }} />);
    await act(async () => requests[0].resolve());
    expect(mounted.container.querySelector('img')).toBeNull();
    await act(async () => requests[1].resolve());
    expect(mounted.container.querySelector('img')?.getAttribute('src')).toBe('https://fixture.invalid/two');
    mounted.rerender(<RemoteMediaImage {...props} media={{ identity: 'removed', url: null, expiresAt: null }} />);
    expect(mounted.container.querySelector('img')).toBeNull();
  });
  it('preserves a ready frame during explicit retry and uses the latest URI', async () => {
    const mounted = render(<RemoteMediaImage {...props} />);
    await act(async () => requests[0].resolve());
    const first = mounted.container.querySelector('img');
    mounted.rerender(<RemoteMediaImage {...props} retryToken={1} media={{ ...media, url: 'https://fixture.invalid/fresh' }} />);
    expect(mounted.container.querySelector('img')).toBe(first);
    await act(async () => requests[1].resolve());
    expect(mounted.container.querySelector('img')?.getAttribute('src')).toBe('https://fixture.invalid/fresh');
  });
  it('discards a late decode after the actor changes, without callbacks', async () => {
    let ready = 0;
    const mounted = render(<RemoteMediaImage {...props} onReady={() => ready++} />);
    actor = { userId: 'other', epoch: 2 };
    await act(async () => requests[0].resolve());
    expect(mounted.container.querySelector('img')).toBeNull();
    expect(ready).toBe(0);
  });
  it('falls back to load after decode rejection and keeps DOM ownership per consumer', async () => {
    const mounted = render(<><RemoteMediaImage {...props} /><RemoteMediaImage {...props} transitionMs={0} /></>);
    await act(async () => requests[0].reject());
    act(() => fireEvent.load(requests[0].image));
    await act(async () => requests[1].resolve());
    expect(mounted.container.querySelectorAll('img')).toHaveLength(2);
    const frames = mounted.container.querySelectorAll('img');
    expect(frames[0].style.animationDuration).toBe('120ms');
    expect(frames[1].style.animationDuration).toBe('0ms');
  });
});
