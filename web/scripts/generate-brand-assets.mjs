import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../../', import.meta.url);
const require = createRequire(new URL('API/package.json', root));
const sharp = require('sharp'); // Existing maintenance dependency, not part of the web build.
const source = await readFile(new URL('app/assets/brand/mark.svg', root), 'utf8');
const glyph = source.match(/<path[^>]*d="([^"]+)"/)?.[1];
if (!glyph || /<script|<text|(?:href|src)=/i.test(source)) throw new Error('Invalid local brand vector');
const svg = (size, color, background, scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">${background ? `<path fill="${background}" d="M0 0h24v24H0z"/>` : ''}<g transform="translate(12 12) scale(${scale}) translate(-12 -12)"><path fill="${color}" d="${glyph}"/></g></svg>`;
const outputs = [
  ['app/assets/favicon.png', 48, '#FFFFFF', '#B90041', .72],
  ...[180, 192, 512].map(size => [`app/public/icons/icon-${size}.png`, size, '#FFFFFF', '#B90041', .66]),
  ['app/public/icons/icon-maskable-512.png', 512, '#FFFFFF', '#B90041', .56],
  ['app/assets/splash-icon.png', 1024, '#B90041', null, 1],
  ['app/assets/splash-icon-dark.png', 1024, '#FF8FB5', null, 1]
];
for (const [file, size, color, background, scale] of outputs) {
  const target = new URL(file, root);
  await mkdir(new URL('.', target), { recursive: true });
  await sharp(Buffer.from(svg(size, color, background, scale))).ensureAlpha().png({ palette: false, compressionLevel: 9 }).toFile(fileURLToPath(target));
}
await mkdir(new URL('app/public/brand/', root), { recursive: true });
await writeFile(new URL('app/public/brand/boot-mark.svg', root), source);
await writeFile(new URL('app/public/brand/boot-mark-dark.svg', root), source.replace('#B90041', '#FF8FB5'));
console.log('Generated 7 PNGs and 2 local SVGs; launcher icons unchanged.');
