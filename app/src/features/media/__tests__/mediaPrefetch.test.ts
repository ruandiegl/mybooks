import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMediaPrefetchQueue } from '../mediaPrefetchQueue';
import type { MediaRequest, MediaScope } from '../mediaTypes';

const scope = { userId: 'a', epoch: 1 };
const request = (index: number, expiresAt: string | null = null): MediaRequest => ({ media: { identity: 'photo-' + index, url: 'https://fixture.invalid/' + index, expiresAt }, pixelBucket: 512 });
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
afterEach(() => vi.useRealTimers());
describe('bounded media anticipation', () => {
  it('rechecks expiry before starting a grant that spent time queued', async () => {
    vi.useFakeTimers();
    const urls: string[] = [], finish: Array<(value: boolean) => void> = [];
    const queue = createMediaPrefetchQueue(url => { urls.push(url); return new Promise<boolean>(resolve => finish.push(resolve)); });
    queue.enqueue([request(0), request(1), request(2, new Date(Date.now() + 30000).toISOString())], scope, () => scope);
    vi.setSystemTime(Date.now() + 40000); finish[0](true); finish[1](true); await flush();
    expect(urls).toEqual(['https://fixture.invalid/0', 'https://fixture.invalid/1']);
    expect(queue.snapshot().inFlight).toBe(0);
  });
  it('prepares at most four resources with two concurrent requests and deduplicates the same window', async () => {
    const urls: string[] = [], finish: Array<(value: boolean) => void> = [];
    const queue = createMediaPrefetchQueue(url => { urls.push(url); return new Promise<boolean>(resolve => finish.push(resolve)); });
    queue.enqueue([0, 1, 2, 3, 4].map(i => request(i)), scope, () => scope);
    queue.enqueue([request(0), request(1)], scope, () => scope);
    expect(urls).toEqual(['https://fixture.invalid/0', 'https://fixture.invalid/1']);
    expect(queue.snapshot().inFlight).toBe(2);
    finish[0](true); await flush(); expect(urls).toHaveLength(3);
    finish[1](true); await flush(); expect(urls).toHaveLength(4);
    finish[2](true); finish[3](true); await flush();
    expect(queue.snapshot().warmed).toBe(4);
    queue.enqueue([request(0)], scope, () => scope); await flush(); expect(urls).toHaveLength(4);
  });
  it('skips expired and near-expiry grants without mutating signed query parameters', async () => {
    const urls: string[] = [];
    const queue = createMediaPrefetchQueue(async url => { urls.push(url); return true; });
    const now = Date.now();
    const signed = request(3, new Date(now + 60000).toISOString()); signed.media.url = 'https://fixture.invalid/3?sig=abc&part=2';
    queue.enqueue([request(0, new Date(now - 1).toISOString()), request(1, new Date(now + 19000).toISOString()), request(2, 'invalid'), signed], scope, () => scope);
    await flush(); expect(urls).toEqual(['https://fixture.invalid/3?sig=abc&part=2']);
  });
  it('drops queued work on blur and rejects completions belonging to an old actor/epoch', async () => {
    const urls: string[] = [], finish: Array<(value: boolean) => void> = [];
    let current: MediaScope | null = scope;
    const queue = createMediaPrefetchQueue(url => { urls.push(url); return new Promise<boolean>(resolve => finish.push(resolve)); });
    const cancel = queue.enqueue([0, 1, 2, 3].map(i => request(i)), scope, () => current);
    cancel(); current = { userId: 'b', epoch: 2 };
    finish[0](true); finish[1](true); await flush();
    expect(urls).toHaveLength(2);
    expect(queue.snapshot().warmed).toBe(0);
    expect(queue.snapshot().metadata).toBe(0);
    expect(queue.snapshot().discarded).toBe(2);
  });
  it('keeps at most twenty-four metadata entries and evicts the oldest warm resource', async () => {
    const urls: string[] = [];
    const queue = createMediaPrefetchQueue(async url => { urls.push(url); return true; });
    for (let i = 0; i < 30; i++) { queue.enqueue([request(i)], scope, () => scope); await flush(); }
    expect(queue.snapshot().metadata).toBe(24);
    queue.enqueue([request(0)], scope, () => scope); await flush();
    expect(urls.filter(url => url === 'https://fixture.invalid/0')).toHaveLength(2);
  });
  it('disposing A never removes B metadata, even when an A request finishes late', async () => {
    let finish!: (value: boolean) => void;
    let current: MediaScope = scope;
    const queue = createMediaPrefetchQueue(url => url.endsWith('/0') ? new Promise<boolean>(resolve => { finish = resolve; }) : Promise.resolve(true));
    queue.enqueue([request(0)], scope, () => current);
    queue.dispose(scope); current = { userId: 'b', epoch: 2 };
    queue.enqueue([request(1)], current, () => current); await flush();
    queue.dispose(scope); finish(true); await flush();
    expect(queue.snapshot().metadata).toBe(1);
    expect(queue.snapshot().warmed).toBe(1);
    expect(queue.snapshot().discarded).toBe(1);
  });
});
