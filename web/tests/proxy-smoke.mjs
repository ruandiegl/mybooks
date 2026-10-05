import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, request as httpRequest } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const distRoot = path.join(repoRoot, 'app/dist');
const caddyBin = process.env.CADDY_BIN || 'caddy';
const version = spawnSync(caddyBin, ['version'], { encoding: 'utf8', windowsHide: true });
assert.equal(version.status, 0, 'Caddy must be available on PATH or passed through CADDY_BIN');

const api = createServer(async (req, res) => {
  if (req.url?.startsWith('/api/v1/')) {
    const body = [];
    for await (const chunk of req) body.push(chunk);
    res.writeHead(401, {
      'content-type': 'application/json',
      'set-cookie': 'web-smoke=preserved; HttpOnly; Secure; SameSite=Lax'
    });
    res.end(JSON.stringify({
      method: req.method,
      body: Buffer.concat(body).toString(),
      origin: req.headers.origin,
      forwardedFor: req.headers['x-forwarded-for'],
      forwardedProto: req.headers['x-forwarded-proto'],
      error: { code: 'UNAUTHENTICATED' }
    }));
    return;
  }
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"status":"ok"}');
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end('{"error":"not found"}');
});

api.on('upgrade', (req, socket) => {
  const accept = createHash('sha1')
    .update(`${req.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64');
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '',
    ''
  ].join('\r\n'));
  socket.end();
});

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function request(url, options) {
  const response = await fetch(url, options);
  return { response, text: await response.text() };
}

async function waitForWeb(port, child, logs) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Caddy exited before listening.\n${logs.join('')}`);
    try {
      return await fetch(`http://127.0.0.1:${port}/health`);
    } catch {
      await delay(125);
    }
  }
  throw new Error(`Caddy did not start in time.\n${logs.join('')}`);
}

const apiPort = await listen(api);
const webPort = await reservePort();
const logs = [];
const child = spawn(caddyBin, ['run', '--config', path.join(repoRoot, 'web/Caddyfile'), '--adapter', 'caddyfile'], {
  env: { ...process.env, API_UPSTREAM: `http://127.0.0.1:${apiPort}`, PORT: String(webPort), WEB_ROOT: distRoot },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});
child.stdout.on('data', (chunk) => logs.push(chunk.toString()));
child.stderr.on('data', (chunk) => logs.push(chunk.toString()));

try {
  const healthThroughProxy = await waitForWeb(webPort, child, logs);
  assert.equal(healthThroughProxy.status, 200);

  const deepLink = await request(`http://127.0.0.1:${webPort}/discover`, { headers: { accept: 'text/html' } });
  assert.equal(deepLink.response.status, 200);
  assert.match(deepLink.text, /<div id="root"><\/div>/);

  const missingAsset = await request(`http://127.0.0.1:${webPort}/missing.js`, { headers: { accept: 'text/html' } });
  assert.equal(missingAsset.response.status, 404);
  assert.doesNotMatch(missingAsset.text, /<div id="root"><\/div>/);

  const apiResponse = await request(`http://127.0.0.1:${webPort}/api/v1/protected`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      origin: 'https://trocalivros.example',
      'x-forwarded-for': '203.0.113.17',
      'x-forwarded-proto': 'https'
    },
    body: '{"probe":true}'
  });
  assert.equal(apiResponse.response.status, 401);
  assert.match(apiResponse.response.headers.get('content-type'), /application\/json/);
  assert.match(apiResponse.response.headers.get('set-cookie') || '', /web-smoke=preserved/);
  assert.deepEqual(JSON.parse(apiResponse.text), {
    method: 'POST',
    body: '{"probe":true}',
    origin: 'https://trocalivros.example',
    forwardedFor: '203.0.113.17',
    forwardedProto: 'https',
    error: { code: 'UNAUTHENTICATED' }
  });

  const postNavigation = await request(`http://127.0.0.1:${webPort}/discover`, { method: 'POST', headers: { accept: 'text/html' }, body: 'must-not-fallback' });
  assert.notEqual(postNavigation.response.status, 200, 'non-GET/HEAD navigation must not receive the app shell');

  const jsFile = (await (await import('node:fs/promises')).readdir(path.join(distRoot, '_expo/static/js/web'))).find((file) => file.endsWith('.js'));
  assert.ok(jsFile, 'the export must contain a hashed JavaScript bundle');
  const asset = await request(`http://127.0.0.1:${webPort}/_expo/static/js/web/${jsFile}`);
  assert.equal(asset.response.status, 200);
  assert.match(asset.response.headers.get('cache-control') || '', /immutable/);

  await new Promise((resolve, reject) => {
    const req = httpRequest(`http://127.0.0.1:${webPort}/socket.io/?EIO=4&transport=websocket`, {
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': Buffer.from('trocalivros-pwa!').toString('base64')
      }
    });
    req.once('upgrade', (response, socket) => {
      try {
        assert.equal(response.statusCode, 101);
        socket.destroy();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    req.once('response', (response) => reject(new Error(`WebSocket request returned HTTP ${response.statusCode}`)));
    req.once('error', reject);
    req.end();
  });

  process.stdout.write('Web proxy smoke test passed.\n');
} finally {
  child.kill();
  await close(api);
}
