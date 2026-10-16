import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
const root = new URL('../../', import.meta.url);
const read = file => readFile(new URL(file, root));

// Decode generated RGBA PNGs without adding a package to the app/CI.
function pixels(bytes) {
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert.equal(bytes[24], 8); assert.equal(bytes[25], 6); assert.equal(bytes[28], 0);
  const chunks = [];
  for (let at = 8; at < bytes.length;) {
    const length = bytes.readUInt32BE(at), type = bytes.toString('ascii', at + 4, at + 8);
    if (type === 'IDAT') chunks.push(bytes.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4, out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) for (let x = 0; x < stride; x++) {
    const at = y * stride + x, filter = raw[y * (stride + 1)];
    const a = x >= 4 ? out[at - 4] : 0, b = y ? out[at - stride] : 0, c = y && x >= 4 ? out[at - stride - 4] : 0;
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    const predict = [0, a, b, Math.floor((a + b) / 2), pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
    assert.notEqual(predict, undefined);
    out[at] = (raw[y * (stride + 1) + x + 1] + predict) & 255;
  }
  return { width, height, out };
}

for (const [file, size] of [['app/assets/favicon.png', 48], ['app/public/icons/icon-180.png', 180], ['app/public/icons/icon-192.png', 192], ['app/public/icons/icon-512.png', 512], ['app/public/icons/icon-maskable-512.png', 512]]) {
  test(`${file}: actual size, opaque brand pixels and no placeholder`, async () => {
    const bytes = await read(file), { width, height, out } = pixels(bytes);
    assert.equal(width, size); assert.equal(height, size); assert.ok(bytes.length <= 100 * 1024);
    assert.deepEqual([...out.subarray(0, 4)], [185, 0, 65, 255]);
    let white = 0;
    for (let at = 0; at < out.length; at += 4) {
      assert.equal(out[at + 3], 255);
      if (out[at] === 255 && out[at + 1] === 255 && out[at + 2] === 255) white++;
      if (file.includes('maskable') && out[at] > 240 && out[at + 1] > 240) {
        const x = (at / 4) % width, y = Math.floor(at / 4 / width);
        assert.ok(Math.hypot(x - width / 2, y - height / 2) < width * .4, 'glyph must fit the circular safe zone');
      }
    }
    assert.ok(white > size * size * .05, 'the actual book glyph must be visible');
  });
}
test('splash has transparent corners and tinted book pixels', async () => {
  for (const [file, rgb] of [['app/assets/splash-icon.png', [185, 0, 65]], ['app/assets/splash-icon-dark.png', [255, 143, 181]]]) {
    const { width, height, out } = pixels(await read(file));
    assert.equal(width, 1024); assert.equal(height, 1024); assert.equal(out[3], 0);
    assert.ok(out.some((v, i) => i % 4 === 3 && v === 255 && rgb.every((c, k) => out[i - 3 + k] === c)));
  }
});
test('manifest keeps identity, distinct masks, Apple and local vector source', async () => {
  const manifest = JSON.parse(await read('app/public/manifest.json'));
  assert.equal(manifest.id, '/'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  const mask = manifest.icons.find(i => i.purpose === 'maskable');
  assert.ok(mask); assert.equal(mask.sizes, '512x512');
  assert.notEqual(mask.src, manifest.icons.find(i => i.sizes === '512x512' && i.purpose === 'any').src);
  for (const icon of manifest.icons) await read(`app/public${icon.src}`);
  const svg = (await read('app/assets/brand/mark.svg')).toString();
  assert.doesNotMatch(svg, /<script|<text|(?:href|src)=|@font-face/i);
  assert.match(svg, /viewBox="0 0 24 24"/);
  assert.ok((await read('app/assets/brand/NOTICE.md')).length);
  console.log('Validated brand source:', fileURLToPath(new URL('app/assets/brand/mark.svg', root)));
});
