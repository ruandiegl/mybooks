import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../app/dist');
const read = (file) => readFile(path.join(root, file), 'utf8');

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(file) : [file];
  }));
  return nested.flat();
}

const html = await read('index.html');
const manifest = JSON.parse(await read('manifest.json'));
const worker = await read('sw.js');

assert.match(html, /rel=["']manifest["']/i, 'Expo HTML must link the PWA manifest');
assert.match(html, /apple-touch-icon/i, 'Expo HTML must expose the iOS home-screen icon');
assert.match(html, /name=["']apple-mobile-web-app-capable["']/i, 'Expo HTML must enable standalone iOS display');
assert.match(html, /serviceWorker\.register\(["']\/sw\.js["']/i, 'the web shell must register the limited service worker');
assert.equal(manifest.name, 'TrocaLivros');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');

for (const expectedSize of ['192x192', '512x512']) {
  const icon = manifest.icons.find((item) => item.sizes === expectedSize);
  assert.ok(icon, `manifest must declare a ${expectedSize} icon`);
  const iconPath = path.join(root, icon.src.replace(/^\//, ''));
  await stat(iconPath);
  const bytes = await readFile(iconPath);
  const [width, height] = expectedSize.split('x').map(Number);
  assert.equal(bytes.readUInt32BE(16), width, `${expectedSize} icon width must match its manifest declaration`);
  assert.equal(bytes.readUInt32BE(20), height, `${expectedSize} icon height must match its manifest declaration`);
}
await stat(path.join(root, 'icons/icon-180.png'));

const precacheMatch = worker.match(/const PRECACHE_URLS = (\[[\s\S]*?\]);/);
assert.ok(precacheMatch, 'service worker must declare its pre-cache list');
const precacheUrls = JSON.parse(precacheMatch[1]);
assert.ok(precacheUrls.includes('/offline.html'), 'the offline page must be available without a network');
assert.ok(!precacheUrls.includes('/index.html'), 'the app shell and authenticated page must never be cached');
assert.ok(precacheUrls.every((url) => url === '/offline.html' || /^\/(?:_expo\/static|assets)\//.test(url)), 'only hashed build assets and the generic offline page may be cached');
assert.ok(precacheUrls.filter((url) => url !== '/offline.html').every((url) => /[a-f0-9]{8,}/i.test(path.basename(url))), 'cached app assets must include a content hash');

const assetFiles = await listFiles(root);
const scripts = await Promise.all(assetFiles.filter((file) => /\.js$/i.test(file)).map((file) => readFile(file, 'utf8')));
const localEnv = await readFile(path.resolve(root, '../.env'), 'utf8').catch(() => '');
const localUrls = localEnv.match(/^EXPO_PUBLIC_(?:API_BASE_URL|SOCKET_URL)=(.*)$/gm)?.map((line) => line.split('=').slice(1).join('=').trim()) ?? [];
const files = [html, await read('manifest.json'), worker, ...scripts].join('\n');
assert.doesNotMatch(files, /https?:\/\/(?:localhost|127\.0\.0\.1):3001\b/i, 'the production web bundle must not contain the local API fallback');
assert.doesNotMatch(files, /EXPO_PUBLIC_(?:API_BASE_URL|SOCKET_URL)/, 'public build files must not expose configuration variable names');
for (const localUrl of new Set(localUrls.filter(Boolean))) {
  assert.ok(!files.includes(localUrl), 'the production web bundle must not include URLs from app/.env');
}

process.stdout.write('PWA build smoke test passed.\n');
