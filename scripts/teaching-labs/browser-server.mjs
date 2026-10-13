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
