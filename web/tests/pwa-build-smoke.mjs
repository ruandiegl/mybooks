import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../app/package.json', import.meta.url));
const { JSDOM } = require('jsdom');

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

// Exercise the exported boot shell, including removal of inert and its watchdog.
const bootDOM = new JSDOM(html, { url: 'https://fixture.invalid/', runScripts: 'outside-only' });
const timers = new Map(); let timerId = 0;
bootDOM.window.setTimeout = (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; };
bootDOM.window.clearTimeout = id => timers.delete(id);
const bootScript = bootDOM.window.document.getElementById('tl-boot-bootstrap');
assert.ok(bootScript, 'export must present a brand before the React bundle');
bootDOM.window.eval(bootScript.textContent);
assert.equal(bootDOM.window.document.getElementById('tl-boot').hidden, false);
assert.ok(bootDOM.window.document.getElementById('root').hasAttribute('inert'));
assert.equal(bootDOM.window.document.getElementById('tl-boot-reload').hidden, true);
assert.equal([...timers.values()][0].delay, 15000);
[...timers.values()][0].callback();
assert.equal(bootDOM.window.document.getElementById('tl-boot-reload').hidden, false);
bootDOM.window.__trocalivrosBoot.release();
bootDOM.window.__trocalivrosBoot.release();
assert.equal(bootDOM.window.document.getElementById('tl-boot'), null);
assert.equal(bootDOM.window.document.getElementById('root').hasAttribute('inert'), false);
assert.equal(timers.size, 0);
bootDOM.window.close();

const favicon = await readFile(path.join(root, 'favicon.ico'));
assert.equal(favicon.readUInt16LE(2), 1);
const iconSizes = Array.from({ length: favicon.readUInt16LE(4) }, (_, i) => favicon[6 + 16 * i] || 256);
assert.ok(iconSizes.includes(16) && iconSizes.includes(32), 'exported favicon must include small browser sizes');
const maskable = manifest.icons.find(icon => icon.purpose === 'maskable');
assert.ok(maskable && maskable.src !== manifest.icons.find(icon => icon.purpose === 'any' && icon.sizes === '512x512').src);
await stat(path.join(root, maskable.src.replace(/^\//, '')));

// Execute the exported early listener, not just a source-text assertion.
const installBootstrap = html.match(/<script id="pwa-install-bootstrap">([\s\S]*?)<\/script>/)?.[1];
assert.ok(installBootstrap, 'export must capture install events before React/fonts load');
const installWindow = new EventTarget();
runInNewContext(installBootstrap, { window: installWindow, Event });
const pendingInstall = new Event('beforeinstallprompt', { cancelable: true });
installWindow.dispatchEvent(pendingInstall);
assert.equal(pendingInstall.defaultPrevented, true);
assert.equal(installWindow.__trocalivrosPwaInstallBridge.pending, pendingInstall);
installWindow.dispatchEvent(new Event('appinstalled'));
assert.equal(installWindow.__trocalivrosPwaInstallBridge.pending, null);
assert.equal(installWindow.__trocalivrosPwaInstallBridge.installed, true);

const viewportTag = html.match(/<meta\b[^>]*\bname=["']viewport["'][^>]*>/i)?.[0];
assert.ok(viewportTag, 'exported HTML must declare its mobile viewport');
const viewportContent = viewportTag.match(/\bcontent=["']([^"']*)["']/i)?.[1] ?? '';
const viewport = Object.fromEntries(viewportContent.split(',').map(entry => entry.trim().split('=')));
assert.equal(viewport['viewport-fit'], 'cover', 'export must expose real iOS safe-area insets');
assert.notEqual(viewport['user-scalable'], 'no', 'the PWA must allow accessibility pinch zoom');
assert.ok(Number(viewport['maximum-scale'] ?? 10) > 1, 'the viewport must not lock user zoom');

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

// Exercise the exported worker, not just its source text.
const handlers = new Map();
let cacheWrites = 0, cacheReads = 0;
const origin = 'https://fixture.invalid';
runInNewContext(worker, {
  URL,
  self: { location: { origin }, addEventListener: (type, handler) => handlers.set(type, handler) },
  caches: { open: async () => ({
    match: async request => { cacheReads++; return typeof request === 'string' ? undefined : request.url.includes('?') ? undefined : new Response('public static asset'); },
    put: async () => { cacheWrites++; }, addAll: async () => { cacheWrites++; }
  }) },
  fetch: async () => new Response('network-only fixture')
});
for (const url of [origin + '/api/v1/me', origin + '/api/v1/books', 'https://private-r2.invalid/books/photo?X-Amz-Signature=fixture']) {
  let handled = false;
  handlers.get('fetch')({ request: new Request(url), respondWith: () => { handled = true; } });
  assert.equal(handled, false, 'private API/R2 media must bypass the worker');
}
const publicAsset = precacheUrls.find(url => url !== '/offline.html');
let publicResponse;
handlers.get('fetch')({ request: new Request(origin + publicAsset), respondWith: promise => { publicResponse = promise; } });
assert.equal(await (await publicResponse).text(), 'public static asset');
let signedResponse;
handlers.get('fetch')({ request: new Request(origin + publicAsset + '?X-Amz-Signature=fixture'), respondWith: promise => { signedResponse = promise; } });
assert.equal(await (await signedResponse).text(), 'network-only fixture');
assert.equal(cacheWrites, 0, 'runtime requests must never persist private responses');
assert.equal(cacheReads, 2, 'only the public-asset candidates may reach cache lookup');
process.stdout.write('PWA build smoke test passed, including runtime private-media bypass.\n');
