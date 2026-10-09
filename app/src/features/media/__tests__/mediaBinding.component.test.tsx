// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const session = vi.hoisted(() => ({ userId: 'viewer' as string | undefined, epoch: 1 }));
vi.mock('react-native', async () => await import('react-native-web'));
vi.mock('../../../providers/SessionProvider', () => ({ useSession: () => ({ getSessionScope: () => ({ ...session }) }) }));
import { useMediaBinding } from '../useMediaBinding';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => { session.userId = 'viewer'; session.epoch = 1; });
it('reads the live actor through a stable callback and defaults to no motion', () => {
  const hook = renderHook(useMediaBinding);
  const getter = hook.result.current.getScope;
  expect(hook.result.current.scope).toEqual({ userId: 'viewer', epoch: 1 });
  expect(hook.result.current.transitionMs).toBe(0);
  session.userId = 'other'; session.epoch = 2;
  expect(getter()).toEqual({ userId: 'other', epoch: 2 });
  session.userId = undefined;
  expect(getter()).toBeNull();
});
it('reacts to the Web reduced-motion preference without overriding card gesture listeners', () => {
  let listener!: () => void;
  const preference = { matches: false, addEventListener: (_: string, callback: () => void) => { listener = callback; }, removeEventListener: () => {} };
  vi.stubGlobal('matchMedia', () => preference);
  const hook = renderHook(useMediaBinding);
  expect(hook.result.current.transitionMs).toBe(120);
  preference.matches = true; act(() => listener());
  expect(hook.result.current.transitionMs).toBe(0);
});
