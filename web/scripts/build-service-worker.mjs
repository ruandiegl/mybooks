import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputRoot = path.resolve(process.cwd(), process.argv[2] || 'dist');

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(file) : [file];
  }));
  return nested.flat();
}

const files = await listFiles(outputRoot);
const hashedAssets = files
  .map((file) => path.relative(outputRoot, file).split(path.sep).join('/'))
  .filter((file) => /^(?:_expo\/static|assets)\//.test(file) && /[a-f0-9]{8,}/i.test(path.basename(file)))
  .sort();

if (!hashedAssets.length) throw new Error('Expo web export did not contain any hashed static assets.');

const revision = createHash('sha256').update(hashedAssets.join('\n')).digest('hex').slice(0, 12);
const precacheUrls = ['/offline.html', ...hashedAssets.map((file) => `/${file}`)];
const worker = `const CACHE_NAME = 'trocalivros-static-${revision}';
const CACHE_PREFIX = 'trocalivros-static-';
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.open(CACHE_NAME)).match('/offline.html')));
    return;
  }

  const pathname = new URL(request.url).pathname;
  if (!PRECACHE_URLS.includes(pathname) || pathname === '/offline.html') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(request)) || fetch(request);
  })());
});
`;

await readFile(path.join(outputRoot, 'offline.html'));
await writeFile(path.join(outputRoot, 'sw.js'), worker, 'utf8');
process.stdout.write(`Generated the offline worker with ${hashedAssets.length} fingerprinted assets.\n`);
