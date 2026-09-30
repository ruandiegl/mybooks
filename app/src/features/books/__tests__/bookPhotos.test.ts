import { describe, expect, it } from 'vitest';
import {
  appendBookPhotos,
  createBookPhoto,
  moveBookPhoto,
  removeBookPhoto
} from '../bookPhotos';

const photo = (id: string) => ({ id, uri: `file://${id}.jpg`, mimeType: 'image/jpeg' as const, size: 1024 });

describe('book photo drafts', () => {
  it('validates supported formats and per-photo size', () => {
    expect(createBookPhoto({ uri: 'file://cover.jpg', mimeType: 'image/jpeg', fileSize: 1024 }, 'one'))
      .toMatchObject({ id: 'one', uri: 'file://cover.jpg', mimeType: 'image/jpeg', size: 1024 });
    expect(() => createBookPhoto({ uri: 'file://cover.heic', mimeType: 'image/heic', fileSize: 1024 }, 'one'))
      .toThrow(expect.objectContaining({ code: 'IMAGE_TYPE_INVALID' }));
    expect(() => createBookPhoto({ uri: 'file://cover.jpg', mimeType: 'image/jpeg', fileSize: 0 }, 'one'))
      .toThrow(expect.objectContaining({ code: 'IMAGE_SIZE_INVALID' }));
    expect(() => createBookPhoto({ uri: 'file://cover.jpg', mimeType: 'image/jpeg' }, 'one'))
      .toThrow(expect.objectContaining({ code: 'IMAGE_SIZE_INVALID' }));
  });

  it('allows at most three different photos and ignores duplicate URIs', () => {
    const current = [photo('one')];
    const result = appendBookPhotos(current, [photo('one'), photo('two'), photo('three')]);
    expect(result.map(({ id }) => id)).toEqual(['one', 'two', 'three']);
    expect(() => appendBookPhotos(result, [photo('four')]))
      .toThrow(expect.objectContaining({ code: 'IMAGE_LIMIT_REACHED' }));
  });

  it('moves the chosen photo and keeps the first position as the cover', () => {
    const result = moveBookPhoto([photo('one'), photo('two'), photo('three')], 2, 0);
    expect(result.map(({ id }) => id)).toEqual(['three', 'one', 'two']);
    expect(moveBookPhoto(result, 0, 0)).toEqual(result);
  });

  it('removes only the selected photo and leaves the remaining order intact', () => {
    const result = removeBookPhoto([photo('one'), photo('two'), photo('three')], 0);
    expect(result.map(({ id }) => id)).toEqual(['two', 'three']);
  });
});
