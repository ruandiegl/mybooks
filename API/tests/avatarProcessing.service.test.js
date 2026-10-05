import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { normalizeAvatar } from '../src/modules/media/avatarProcessing.service.js';

describe('decoded avatar output', () => {
  it('flattens the visible white background and discards metadata', async () => {
    const png = await sharp({ create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const result = await normalizeAvatar(png, { protocolVersion: 2, mimeType: 'image/png', size: png.length });
    const image = sharp(result.buffer);
    const metadata = await image.metadata();
    expect(metadata).toMatchObject({ format: 'jpeg', width: 512, height: 512, hasAlpha: false });
    expect(metadata.exif).toBeUndefined();
    const { data } = await image.raw().toBuffer({ resolveWithObject: true });
    expect([...data.slice(0, 3)]).toEqual([255, 255, 255]);
  });
  it('does not accept a falsely labelled SVG or corrupted image', async () => {
    for (const buffer of [Buffer.from('<svg width="512" height="512"></svg>'), Buffer.from('invalid')]) {
      await expect(normalizeAvatar(buffer, { protocolVersion: 2, mimeType: 'image/png', size: buffer.length }))
        .rejects.toMatchObject({ code: 'IMAGE_TYPE_INVALID' });
    }
  });
  it('rejects a v2 file whose dimensions are not the confirmed crop', async () => {
    const png = await sharp({ create: { width: 512, height: 256, channels: 3, background: 'red' } }).png().toBuffer();
    await expect(normalizeAvatar(png, { protocolVersion: 2, mimeType: 'image/png', size: png.length }))
      .rejects.toMatchObject({ code: 'AVATAR_CROP_INVALID' });
  });
  it('normalizes a supported old client crop to the new dimensions', async () => {
    const jpeg = await sharp({ create: { width: 800, height: 400, channels: 3, background: 'blue' } }).jpeg().toBuffer();
    const result = await normalizeAvatar(jpeg, { protocolVersion: 1, mimeType: 'image/jpeg', size: jpeg.length });
    expect(await sharp(result.buffer).metadata()).toMatchObject({ width: 512, height: 512, format: 'jpeg' });
  });
});
