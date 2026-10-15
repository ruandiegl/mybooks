// Local read-only export fixture. No real API, credentials or external proxy.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../app/dist/', import.meta.url));
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1:4182');
    if (/^\/(api|socket.io)(\/|$)/.test(url.pathname)) { response.writeHead(401, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'QA sem sessão' } })); return; }
    let target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!target.startsWith(path.resolve(root) + path.sep) && target !== path.resolve(root)) { response.writeHead(403); response.end(); return; }
    try { if (!(await stat(target)).isFile()) target = path.join(root, 'index.html'); }
    catch { if (path.extname(target)) { response.writeHead(404); response.end(); return; } target = path.join(root, 'index.html'); }
    const body = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(body);
  } catch { response.writeHead(404); response.end(); }
}).listen(4182, '127.0.0.1', () => process.stdout.write('PWA QA: http://127.0.0.1:4182 (API fictícia, somente loopback)\n'));
