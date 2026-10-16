import { beforeEach, expect, it, vi } from 'vitest';
const bridge = vi.hoisted(() => ({ hold: vi.fn(async () => true), hide: vi.fn() }));
vi.mock('expo-splash-screen', () => ({ preventAutoHideAsync: bridge.hold, hide: bridge.hide }));
beforeEach(() => { vi.resetModules(); bridge.hold.mockReset().mockResolvedValue(true); bridge.hide.mockReset(); });
it('retains at module evaluation and hides once even when called repeatedly', async () => {
  const { releaseLaunchScreen } = await vi.importActual<typeof import('../launchScreen')>('../launchScreen.ts');
  expect(bridge.hold).toHaveBeenCalledTimes(1); expect(bridge.hide).not.toHaveBeenCalled();
  await releaseLaunchScreen(); await releaseLaunchScreen(); expect(bridge.hide).toHaveBeenCalledTimes(1);
});
it('does not block the first frame on the hold promise, and handles unsupported bridges', async () => {
  let complete!: (value: boolean) => void;
  bridge.hold.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  bridge.hide.mockImplementationOnce(() => { throw Error('unsupported'); });
  const { releaseLaunchScreen } = await vi.importActual<typeof import('../launchScreen')>('../launchScreen.ts');
  await expect(releaseLaunchScreen()).resolves.toBeUndefined(); expect(bridge.hide).toHaveBeenCalledTimes(1);
  complete(true);
});
it('handles a rejected retention without an unhandled rejection', async () => {
  bridge.hold.mockRejectedValueOnce(Error('unsupported'));
  const { releaseLaunchScreen } = await vi.importActual<typeof import('../launchScreen')>('../launchScreen.ts');
  await releaseLaunchScreen(); expect(bridge.hide).toHaveBeenCalledTimes(1);
});
