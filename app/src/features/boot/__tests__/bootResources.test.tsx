// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useBootResources } from '../useBootResources';
beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('becomes ready immediately without a minimum display period', () => {
  const { result } = renderHook(() => useBootResources({ themeHydrated: true, fontsLoaded: true, fontError: null }));
  expect(result.current).toEqual({ ready: true, issue: undefined });
});
it('explains pending resources at eight seconds, allows late readiness and cancels stale timers', () => {
  const { result, rerender } = renderHook(p => useBootResources(p), { initialProps: { themeHydrated: false, fontsLoaded: false, fontError: null as Error | null } });
  act(() => vi.advanceTimersByTime(7999)); expect(result.current.issue).toBeUndefined();
  act(() => vi.advanceTimersByTime(1)); expect(result.current).toEqual({ ready: false, issue: 'resource-timeout' });
  rerender({ themeHydrated: true, fontsLoaded: true, fontError: null }); expect(result.current.ready).toBe(true);
  act(() => vi.advanceTimersByTime(20000)); expect(result.current.issue).toBeUndefined();
  // A late resource signal must never tear down an already mounted session.
  rerender({ themeHydrated: true, fontsLoaded: false, fontError: Error('late') }); expect(result.current.ready).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
it('reports font failures immediately and clears timers on unmount', () => {
  const { result, unmount } = renderHook(() => useBootResources({ themeHydrated: true, fontsLoaded: false, fontError: Error('font') }));
  expect(result.current).toEqual({ ready: false, issue: 'resource-error' });
  unmount(); expect(vi.getTimerCount()).toBe(0);
});
