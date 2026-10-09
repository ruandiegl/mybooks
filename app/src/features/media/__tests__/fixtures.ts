import { vi } from 'vitest';
export const mediaBinding = { scope: { userId: 'fixture-viewer', epoch: 1 }, getScope: () => ({ userId: 'fixture-viewer', epoch: 1 }), transitionMs: 0 as const };
export function installDecodedImages() {
  vi.stubGlobal('Image', function () { const image = document.createElement('img'); image.decode = async () => {}; return image; });
}
