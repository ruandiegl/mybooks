import { describe, expect, it } from 'vitest';
import { storageService } from '../src/modules/media/storage.service.js';

describe('storageService.assertImage', () => {
  it('permite somente JPEG, PNG e WebP', () => {
    expect(() => storageService.assertImage({ mimeType: 'image/jpeg', size: 1024 })).not.toThrow();
    expect(() => storageService.assertImage({ mimeType: 'image/heic', size: 1024 }))
      .toThrow(expect.objectContaining({ code: 'IMAGE_TYPE_INVALID', statusCode: 422 }));
  });

  it('exige bytes válidos e limita cada foto a 8 MiB', () => {
    for (const size of [undefined, 0, -1, 8 * 1024 * 1024 + 1, 10.5]) {
      expect(() => storageService.assertImage({ mimeType: 'image/png', size }))
        .toThrow(expect.objectContaining({ code: 'IMAGE_SIZE_INVALID', statusCode: 422 }));
    }
  });
});
