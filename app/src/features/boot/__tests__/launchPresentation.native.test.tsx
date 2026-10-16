// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
import { useLaunchPresentation } from '../useLaunchPresentation';
beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('native waits for actual layout and image/fallback readiness before the first frame', () => {
  const presented = vi.fn(); const { result, rerender } = renderHook(({ ready }) => useLaunchPresentation(ready, presented), { initialProps: { ready: false } });
  act(() => vi.advanceTimersByTime(32)); expect(presented).not.toHaveBeenCalled();
  act(() => result.current()); act(() => vi.advanceTimersByTime(32)); expect(presented).not.toHaveBeenCalled();
  rerender({ ready: true }); act(() => vi.advanceTimersByTime(32)); expect(presented).toHaveBeenCalledTimes(1);
  act(() => result.current()); act(() => vi.advanceTimersByTime(32)); expect(presented).toHaveBeenCalledTimes(1);
});
it('layout alone cannot deliver a frame after unmount', () => {
  const presented = vi.fn(); const { result, unmount } = renderHook(() => useLaunchPresentation(true, presented));
  act(() => result.current()); unmount(); act(() => vi.advanceTimersByTime(32)); expect(presented).not.toHaveBeenCalled();
});
