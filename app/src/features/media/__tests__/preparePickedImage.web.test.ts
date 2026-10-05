import { beforeEach, describe, expect, it, vi } from 'vitest';
import { preparePickedImage } from '../preparePickedImage.web';

describe('web image preparation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('converts HEIC photos to a bounded JPEG for the existing upload contract', async () => {
    const bitmap = { width: 4000, height: 3000, close: vi.fn() };
    const output = new Blob(['jpeg image data'], { type: 'image/jpeg' });
    const context = { drawImage: vi.fn() };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) => callback(output))
    };
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
    vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => new Blob(['heic image data'], { type: 'image/heic' }) })));
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:converted-cover'), revokeObjectURL: vi.fn() });

    const prepared = await preparePickedImage({ uri: 'blob:original-photo', mimeType: 'image/heic', fileSize: 9000 });

    expect(prepared).toEqual({ uri: 'blob:converted-cover', mimeType: 'image/jpeg', size: output.size });
    expect(canvas.width).toBe(2048);
    expect(canvas.height).toBe(1536);
    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it('rejects an unsupported image with a Safari-specific recovery message', async () => {
    await expect(preparePickedImage({ uri: 'blob:photo', mimeType: 'image/heic', fileSize: 9000 }))
      .rejects.toThrow(/Safari não conseguiu converter foto HEIC/i);
  });
});
