import { beforeEach, expect, it, vi } from 'vitest';
const bridge = vi.hoisted(() => ({ requests: [] as Array<{ url: string; policy: string }>, succeed: true, error: false }));
vi.mock('expo-image', () => ({ Image: { prefetch: async (url: string, options: { cachePolicy: string }) => { bridge.requests.push({ url, policy: options.cachePolicy }); if (bridge.error) throw new Error('network'); return bridge.succeed; } } }));
import { warmMediaUrl } from '../warmMediaUrl.native';
beforeEach(() => { bridge.requests = []; bridge.error = false; bridge.succeed = true; });
it('prepares the unchanged signed URI in memory, never default disk cache', async () => {
  expect(await warmMediaUrl('https://fixture.invalid/image?sig=abc&part=2')).toBe(true);
  expect(bridge.requests).toEqual([{ url: 'https://fixture.invalid/image?sig=abc&part=2', policy: 'memory' }]);
});
it('reports a failed preparation without leaking a bridge rejection into the screen', async () => {
  bridge.error = true; expect(await warmMediaUrl('https://fixture.invalid/image')).toBe(false);
});
