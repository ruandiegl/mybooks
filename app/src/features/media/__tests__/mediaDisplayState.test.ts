import { describe, expect, it } from 'vitest';
import { emptyMediaDisplay, reduceMediaDisplay } from '../mediaDisplayState';
import { toMediaScope, isMediaScopeCurrent } from '../mediaIdentity';
const one = { identity: 'photo1', url: 'https://fixture.invalid/photo?sig=1', expiresAt: null };
function ready() {
  const loading = reduceMediaDisplay(emptyMediaDisplay, { type: 'source', media: one });
  return reduceMediaDisplay(loading, { type: 'loaded', identity: 'photo1', attempt: loading.attempt });
}
describe('media display continuity', () => {
  it('keeps a ready frame through twenty signature renewals and a transient missing grant', () => {
    let state = ready();
    for (let index = 2; index < 22; index++) state = reduceMediaDisplay(state, { type: 'source', media: { ...one, url: `signed${index}` } });
    state = reduceMediaDisplay(state, { type: 'source', media: { ...one, url: null } });
    expect(state.activeUrl).toBe('https://fixture.invalid/photo?sig=1');
    expect(state.status).toBe('ready');
    expect(state.attempt).toBe(1);
  });
  it('clears the prior frame immediately on new content or confirmed removal version', () => {
    const state = reduceMediaDisplay(ready(), { type: 'source', media: { ...one, identity: 'photo2', url: 'two' } });
    expect(state.activeUrl).toBeNull();
    expect(state.pendingUrl).toBe('two');
    const removed = reduceMediaDisplay(ready(), { type: 'source', media: { ...one, identity: 'version2', url: null } });
    expect(removed.activeUrl).toBeNull();
    expect(removed.status).toBe('empty');
  });
  it('retries the same URI explicitly and preserves an existing frame on retry failure', () => {
    const state = ready();
    const retry = reduceMediaDisplay(state, { type: 'retry', media: one });
    expect(retry.attempt).toBe(2);
    expect(retry.activeUrl).toBe('https://fixture.invalid/photo?sig=1');
    const failed = reduceMediaDisplay(retry, { type: 'failed', identity: 'photo1', attempt: 2 });
    expect(failed.activeUrl).toBe('https://fixture.invalid/photo?sig=1');
    expect(failed.status).toBe('error');
    expect(reduceMediaDisplay(failed, { type: 'retry', media: one }).attempt).toBe(3);
  });
  it('ignores callbacks from prior identities and cancelled attempts', () => {
    const loading = reduceMediaDisplay(emptyMediaDisplay, { type: 'source', media: one });
    const next = reduceMediaDisplay(loading, { type: 'source', media: { ...one, url: 'fresh' } });
    expect(reduceMediaDisplay(next, { type: 'loaded', identity: 'photo1', attempt: 1 })).toEqual(next);
    expect(reduceMediaDisplay(next, { type: 'failed', identity: 'old', attempt: next.attempt })).toEqual(next);
    expect(reduceMediaDisplay(next, { type: 'reset' }).activeUrl).toBeNull();
  });
  it('adapts unauthenticated sessions and rejects a different actor or epoch', () => {
    expect(toMediaScope({ userId: undefined, epoch: 3 })).toBeNull();
    expect(toMediaScope({ userId: 'a', epoch: 3 })).toEqual({ userId: 'a', epoch: 3 });
    expect(isMediaScopeCurrent({ userId: 'a', epoch: 3 }, { userId: 'a', epoch: 4 })).toBe(false);
    expect(isMediaScopeCurrent({ userId: 'a', epoch: 3 }, null)).toBe(false);
    expect(isMediaScopeCurrent({ userId: 'a', epoch: 3 }, { userId: 'a', epoch: 3 })).toBe(true);
  });
});
