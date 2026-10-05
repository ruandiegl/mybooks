import { describe, expect, it, vi } from 'vitest';
import { preparePickedImage } from '../preparePickedImage.web';
import type { PickedImageAsset } from '../preparePickedImage';

// Metro resolves './preparePickedImage' inside the web variant back to that
// same variant. Model this platform resolution while running its real code.
vi.mock('../preparePickedImage', () => ({
  MAX_UPLOAD_IMAGE_BYTES: 8 * 1024 * 1024,
  preparePickedImage: (asset: PickedImageAsset) => preparePickedImage(asset)
}));

describe('Metro web image resolution', () => {
  it('prepares a normal JPEG without recursively importing its web variant', async () => {
    await expect(preparePickedImage({ uri: 'blob:jpeg-photo', mimeType: 'image/jpeg', fileSize: 100 }))
      .resolves.toEqual({ uri: 'blob:jpeg-photo', mimeType: 'image/jpeg', size: 100 });
  });
});
