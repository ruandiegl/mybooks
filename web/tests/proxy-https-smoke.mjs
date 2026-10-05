import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const caddyBin = process.env.CADDY_BIN || 'caddy';
const api = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ forwardedProto: req.headers['x-forwarded-proto'] || null }));
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
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

const apiPort = await listen(api);
const reservation = createServer();
const webPort = await listen(reservation);
await close(reservation);
const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'trocalivros-proxy-https-'));
let child;
const logs = [];

try {
  const adapted = spawnSync(caddyBin, ['adapt', '--config', path.join(repoRoot, 'web/Caddyfile'), '--adapter', 'caddyfile'], {
    env: { ...process.env, API_UPSTREAM: `http://127.0.0.1:${apiPort}`, PORT: String(webPort) },
    encoding: 'utf8',
    windowsHide: true
  });
  assert.equal(adapted.status, 0, `Caddy must adapt the production configuration: ${adapted.stderr}`);
  const config = JSON.parse(adapted.stdout);
  // Emulate an ingress peer outside private_ranges without changing the host's
  // network adapters. All production proxy handlers remain unchanged.
  for (const server of Object.values(config.apps.http.servers)) {
    server.trusted_proxies = { source: 'static', ranges: ['192.0.2.0/24'] };
  }
  const configPath = path.join(temporaryRoot, 'caddy.json');
  await writeFile(configPath, JSON.stringify(config));
  child = spawn(caddyBin, ['run', '--config', configPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  child.stdout.on('data', (chunk) => logs.push(chunk.toString()));
  child.stderr.on('data', (chunk) => logs.push(chunk.toString()));

  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Caddy exited before listening: ${logs.join('')}`);
    try {
      await fetch(`http://127.0.0.1:${webPort}/health`);
      ready = true;
      break;
    } catch {
      await delay(125);
    }
  }
  assert.ok(ready, `Caddy must start: ${logs.join('')}`);

  const probes = [
    { name: 'preserves HTTPS terminated at the Railway edge', headers: { 'x-forwarded-proto': 'https' }, expected: 'https' },
    { name: 'does not upgrade an HTTP connection', headers: { 'x-forwarded-proto': 'http' }, expected: 'http' },
    { name: 'does not invent HTTPS when the edge header is missing', headers: {}, expected: null }
  ];
  for (const probe of probes) {
    const response = await fetch(`http://127.0.0.1:${webPort}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-session-transport': 'cookie', ...probe.headers },
      body: '{}'
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).forwardedProto, probe.expected, probe.name);
  }
  process.stdout.write('Proxy HTTPS smoke test passed (3 cases).\n');
} finally {
  if (child && child.exitCode === null) {
    const exited = new Promise((resolve) => child.once('exit', resolve));
    child.kill();
    await exited;
  }
  await close(api);
  await rm(temporaryRoot, { recursive: true, force: true });
}
