import { describe, expect, it } from 'vitest';
import * as crop from '../avatarCrop';
import { clampAvatarTransform, getAvatarCropRect, reframeAvatarTransform, zoomAvatarAtPoint, validateAvatarDimensions, validateAvatarFile } from '../avatarCrop';

const center = { zoom: 1, offsetX: 0, offsetY: 0 };
describe('avatar crop pixels behind the circular preview', () => {
  it.each([
    [{ width: 1200, height: 600 }, { originX: 300, originY: 0, width: 600, height: 600 }],
    [{ width: 600, height: 1200 }, { originX: 0, originY: 300, width: 600, height: 600 }],
    [{ width: 1024, height: 1024 }, { originX: 0, originY: 0, width: 1024, height: 1024 }]
  ])('matches the centered source crop regardless of screen density', (source, expected) => {
    expect(getAvatarCropRect(source, 300, center)).toEqual(expected);
    expect(getAvatarCropRect(source, 150, center)).toEqual(expected);
  });
  it('clamps movement so the full circle remains covered', () => {
    const source = { width: 1200, height: 600 };
    const transformed = clampAvatarTransform(source, 300, { zoom: 1, offsetX: 1000, offsetY: 1000 });
    expect(transformed).toEqual({ zoom: 1, offsetX: 150, offsetY: 0 });
    expect(getAvatarCropRect(source, 300, transformed)).toEqual({ originX: 0, originY: 0, width: 600, height: 600 });
  });
  it('keeps the focal point under the fingers when zooming', () => {
    const source = { width: 1200, height: 600 };
    expect(zoomAvatarAtPoint(source, 300, center, 2, { x: 60, y: 0 })).toEqual({ zoom: 2, offsetX: -60, offsetY: 0 });
    expect(getAvatarCropRect(source, 300, { zoom: 2, offsetX: 100, offsetY: 0 })).toEqual({ originX: 350, originY: 150, width: 300, height: 300 });
  });
  it('preserves the selected source region after resizing the editor', () => {
    const source = { width: 1200, height: 600 };
    const resized = reframeAvatarTransform(source, 300, 240, { zoom: 1, offsetX: 150, offsetY: 0 });
    expect(getAvatarCropRect(source, 240, resized)).toEqual({ originX: 0, originY: 0, width: 600, height: 600 });
  });
  it('button movement selects the same pixels as dragging the image', () => {
    const source = { width: 1200, height: 600 };
    const moved = crop.stepAvatarTransform(source, 300, center, 'left');
    expect(getAvatarCropRect(source, 300, moved)).toEqual({ originX: 340, originY: 0, width: 600, height: 600 });
    expect(getAvatarCropRect(source, 300, crop.stepAvatarTransform(source, 300, center, 'up'))).toEqual({ originX: 300, originY: 0, width: 600, height: 600 });
  });
  it('rejects dangerous or undecodable source bounds before export', () => {
    expect(() => validateAvatarFile('image/gif', 100)).toThrow();
    expect(() => validateAvatarFile('image/png', 25 * 1024 * 1024)).toThrow();
    expect(() => validateAvatarDimensions(0, 512)).toThrow();
    expect(() => validateAvatarDimensions(9000, 9000)).toThrow();
    expect(() => validateAvatarDimensions(128, 128)).not.toThrow();
  });
  it('handles a valid panorama after preparation shrinks its short side', () => {
    expect(getAvatarCropRect({ width: 2048, height: 7 }, 300, center)).toEqual({ originX: 1021, originY: 0, width: 7, height: 7 });
  });
});
