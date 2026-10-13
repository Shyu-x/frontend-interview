// Local-only teaching fixture. No production credentials or external services.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, relative, dirname, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const port = Number(process.env.TEACHING_PORT ?? 8123);
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/api/sse-parsing-reference') {
      if (request.method !== 'GET') { response.writeHead(405).end(); return; }
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
      // Native EventSource is an independent oracle for empty data, CRLF,
      // multiline data, persistent event IDs, and a discarded EOF fragment.
      const bytes = Buffer.from('id: fixture-1\r\ndata:\r\n\r\ndata: 一\r\ndata: 二\r\n\r\ndata: discarded-at-eof');
      let offset = 0;
      const timer = setInterval(() => {
        if (response.destroyed) { clearInterval(timer); return; }
        if (offset === bytes.length) { clearInterval(timer); response.end(); return; }
        response.write(bytes.subarray(offset, ++offset));
      }, 1);
      response.once('close', () => clearInterval(timer));
      return;
    }
    if (url.pathname === '/api/orders' || url.pathname === '/api/error') {
      const delay = Math.min(1000, Math.max(0, Number(url.searchParams.get('delay')) || 0));
      const timer = setTimeout(() => {
        if (response.destroyed) return;
        const failed = url.pathname === '/api/error';
        response.writeHead(failed ? 503 : 200, { 'content-type': 'application/json' });
        response.end(JSON.stringify(failed ? { error: 'unavailable' } : { query: url.searchParams.get('q') ?? '', orders: [{ id: 1 }] }));
      }, delay);
      response.once('close', () => clearTimeout(timer));
      return;
    }
    const decoded = decodeURIComponent(url.pathname);
    if (decoded.includes('\0')) throw new Error('invalid path');
    let file = resolve(root, `.${decoded}`);
    const inside = relative(root, file);
    if (inside === '..' || inside.startsWith('../') || isAbsolute(inside)) {
      response.writeHead(403).end();
      return;
    }
    const entry = await stat(file);
    if (entry.isDirectory()) file = resolve(file, 'index.html');
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    await pipeline(createReadStream(file), response);
  } catch (error) {
    if (!response.headersSent) response.writeHead(error.code === 'ENOENT' ? 404 : 400);
    if (!response.destroyed) response.end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Teaching browser fixtures: http://127.0.0.1:${port}/scripts/teaching-labs/web/demo.html`));
for (const event of ['SIGTERM', 'SIGINT']) process.once(event, () => {
  server.close();
  server.closeAllConnections();
});
