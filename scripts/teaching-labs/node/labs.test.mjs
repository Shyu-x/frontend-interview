import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Readable, Writable } from 'node:stream';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  WorkerPool, transferBuffer, writeWithBackpressure, gzipFile, startJsonServer,
  compose, createSseParser, formatSse, readJsonBody, trackRequestLifecycle,
  getTrackedSignal,
  atomicUpload, createChunkLedger, safeResolve, createRateLimiter,
  createIdempotencyStore, createSingleFlightCache, verifyWebhook,
  createJsonLogger, gracefulClose, topologicalOrder, resolveExport,
  parseServerConfig, createCursorCodec, fetchWithRetry, fetchWithDeadline,
  serveStaticFile, onceEvent, createBoundedQueue, atomicWriteJson,
  assembleChunks,
} from './labs.mjs';

async function scratch(t) {
  const directory = await mkdtemp(resolve(tmpdir(), 'node-teaching-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('N001 worker pool uses reusable worker threads for CPU-bound work', async (t) => {
  const pool = new WorkerPool({ size: 2 });
  t.after(() => pool.close());
  assert.deepEqual(await Promise.all([pool.submit('sum', [1, 2]), pool.submit('sum', [8, 9])]), [3, 17]);
  await assert.rejects(pool.submit('fail', []), /requested worker failure/);
  assert.equal(await pool.submit('sum', [20, 22]), 42);
  await assert.rejects(pool.submit('sum', ['not a number']), /finite numbers/);

  // A host-level crash must retire that Worker while work waits for a live slot.
  const otherSlotBusy = pool.submit('sum', Array.from({ length: 100_000 }, (_, index) => index));
  const crashingWorker = pool.slots[1].worker;
  const recovered = new Promise((resolveTask, rejectTask) => {
    crashingWorker.once('error', () => pool.submit('sum', [30, 12]).then(resolveTask, rejectTask));
  });
  await assert.rejects(pool.submit('crash', []), /uncaught worker failure/);
  assert.equal(await recovered, 42);
  assert.equal(await otherSlotBusy, 4_999_950_000);

  // An exit without a response rejects its active task and the pool spawns a replacement.
  await assert.rejects(pool.submit('exit', []), /worker exited with code 0/);
  assert.equal(await pool.submit('sum', [19, 23]), 42);

  // Symbols cannot cross the structured-clone boundary; the slot remains reusable.
  await assert.rejects(pool.submit(Symbol('invalid-message'), []), /could not be cloned/);
  assert.equal(await pool.submit('sum', [1, 2]), 3);

  const workers = pool.slots.map((slot) => slot.worker);
  const lastTask = pool.submit('sum', Array.from({ length: 100_000 }, (_, index) => index));
  const closeFirst = pool.close();
  const closeSecond = pool.close();
  assert.equal(closeFirst, closeSecond);
  assert.equal(await lastTask, 4_999_950_000);
  await Promise.all([closeFirst, closeSecond]);
  assert.ok(workers.every((worker) => worker.threadId === -1));
  await assert.rejects(pool.submit('sum', [1]), /closing/);
  const bounded = new WorkerPool({ size: 1, maxQueue: 0 });
  t.after(() => bounded.close());
  const active = bounded.submit('sum', Array.from({ length: 100_000 }, (_, index) => index));
  await assert.rejects(bounded.submit('sum', [1]), /queue is full/);
  assert.equal(await active, 4_999_950_000);
});

test('N002 transferred ArrayBuffer changes ownership and rejects other input', () => {
  const source = new ArrayBuffer(8);
  new Uint8Array(source).set([1, 2, 3]);
  const received = transferBuffer(source);
  assert.equal(source.byteLength, 0);
  assert.deepEqual([...new Uint8Array(received).slice(0, 3)], [1, 2, 3]);
  assert.throws(() => transferBuffer('text'), /ArrayBuffer/);
});

test('N003 Writable backpressure waits for drain before finishing', async () => {
  const seen = [];
  const writable = new Writable({ highWaterMark: 1, write(chunk, _encoding, callback) { setTimeout(() => { seen.push(chunk.toString()); callback(); }, 2); } });
  await writeWithBackpressure(writable, ['a', 'b', 'c']);
  assert.deepEqual(seen, ['a', 'b', 'c']);
  assert.equal(writable.writableFinished, true);
  const synchronousWrites = [];
  const synchronous = new Writable({ write(chunk, _encoding, callback) { synchronousWrites.push(chunk.toString()); callback(); } });
  await writeWithBackpressure(synchronous, ['sync']);
  assert.deepEqual(synchronousWrites, ['sync']);
  assert.equal(synchronous.writableFinished, true);
  const failed = new Writable({ write(_chunk, _encoding, callback) { callback(new Error('disk full')); } });
  await assert.rejects(writeWithBackpressure(failed, ['payload']), /disk full/);
});

test('N004 pipeline gzips a real file and preserves bytes after decompression', async (t) => {
  const directory = await scratch(t);
  await writeFile(resolve(directory, 'source.txt'), 'report: revenue rose 12%');
  await gzipFile(resolve(directory, 'source.txt'), resolve(directory, 'source.txt.gz'));
  const { gunzipSync } = await import('node:zlib');
  assert.equal(gunzipSync(await readFile(resolve(directory, 'source.txt.gz'))).toString(), 'report: revenue rose 12%');
  await assert.rejects(gzipFile(resolve(directory, 'missing'), resolve(directory, 'bad.gz')));
});

test('N005 local HTTP server returns JSON and maps handler errors', async (t) => {
  const { server, url } = await startJsonServer((request) => {
    if (request.url === '/missing') throw Object.assign(new Error('not found'), { statusCode: 404 });
    return { route: request.url };
  });
  t.after(() => gracefulClose(server));
  const ok = await fetch(`${url}/orders`);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { route: '/orders' });
  const missing = await fetch(`${url}/missing`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'not found' });
});

test('N006 middleware preserves onion order and rejects duplicate next', async () => {
  const events = [];
  await compose([
    async (_ctx, next) => { events.push('before A'); await next(); events.push('after A'); },
    async (_ctx, next) => { events.push('before B'); await next(); events.push('after B'); },
    async () => events.push('handler'),
  ])({});
  assert.deepEqual(events, ['before A', 'before B', 'handler', 'after B', 'after A']);
  await assert.rejects(compose([(_ctx, next) => { next(); return next(); }])({}), /more than once/);
});

test('N007 SSE parser joins multiline data and handles split UTF-8 chunks', () => {
  const frames = [];
  const parser = createSseParser((frame) => frames.push(frame));
  const bytes = Buffer.from('id: 7\nevent: update\ndata: 第一行\ndata: 第二行\n\n');
  parser.push(bytes.subarray(0, 26));
  parser.push(bytes.subarray(26));
  parser.end();
  assert.deepEqual(frames, [{ data: '第一行\n第二行', event: 'update', id: '7' }]);
});

test('N008 SSE formatter creates valid frames and blocks field injection', () => {
  assert.equal(formatSse({ id: '12', event: 'delta', data: 'a\nb', retry: 500 }), 'event: delta\nid: 12\nretry: 500\ndata: a\ndata: b\n\n');
  assert.throws(() => formatSse({ event: 'message\nid: forged', data: 'x' }), /line break/);
  assert.throws(() => formatSse({ retry: -1, data: 'x' }), /non-negative/);
});

test('N009 bounded JSON body uses received bytes and distinguishes malformed JSON', async () => {
  assert.deepEqual(await readJsonBody(Readable.from(['{"ok":', 'true}']), { maxBytes: 20 }), { ok: true });
  await assert.rejects(readJsonBody(Readable.from(['{"too":"large"}']), { maxBytes: 3 }), (error) => error.statusCode === 413);
  await assert.rejects(readJsonBody(Readable.from(['{bad}'])), (error) => error.statusCode === 400);
});

test('N010 request lifecycle tracks active responses and provides cancellation signal', async (t) => {
  let requestRef;
  let markCancelStarted;
  const cancelStarted = new Promise((resolveStarted) => { markCancelStarted = resolveStarted; });
  const { server, url } = await startJsonServer(async (request) => {
    requestRef = request;
    if (request.url === '/cancel') markCancelStarted(request);
    await new Promise((resolveWait) => setTimeout(resolveWait, request.url === '/cancel' ? 20 : 5));
    return { aborted: getTrackedSignal(request).aborted };
  });
  const lifecycle = trackRequestLifecycle(server);
  t.after(() => gracefulClose(server));
  assert.deepEqual(await (await fetch(url)).json(), { aborted: false });
  assert.equal(lifecycle.active, 0);
  assert.equal(getTrackedSignal(requestRef).aborted, false);
  const controller = new AbortController();
  const pending = fetch(`${url}/cancel`, { signal: controller.signal });
  requestRef = await cancelStarted;
  controller.abort();
  await assert.rejects(pending);
  await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  assert.equal(getTrackedSignal(requestRef).aborted, true);
  assert.equal(lifecycle.active, 0);
  lifecycle.abortAll();
});

test('N011 upload streams to a private temp then atomically publishes; oversize leaves no file', async (t) => {
  const directory = await scratch(t);
  const destination = resolve(directory, 'uploads/report.bin');
  const result = await atomicUpload(Readable.from([Buffer.from('ab'), Buffer.from('cd')]), destination, { maxBytes: 4 });
  assert.deepEqual(result.bytes, 4);
  assert.equal((await readFile(destination)).toString(), 'abcd');
  await assert.rejects(atomicUpload(Readable.from(['12345']), resolve(directory, 'uploads/large.bin'), { maxBytes: 4 }), (error) => error.statusCode === 413);
  const protectedPath = resolve(directory, 'uploads/protected.bin');
  await writeFile(protectedPath, 'previous complete version');
  await assert.rejects(atomicUpload(Readable.from(['too large']), protectedPath, { maxBytes: 3 }), (error) => error.statusCode === 413);
  assert.equal((await readFile(protectedPath)).toString(), 'previous complete version');
  assert.equal((await readdir(resolve(directory, 'uploads'))).some((name) => name.endsWith('.part')), false);
});

test('N012 chunk ledger verifies each retry and the final file digest', () => {
  const left = Buffer.from('front'); const right = Buffer.from('end');
  const full = Buffer.concat([left, right]);
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const ledger = createChunkLedger({ expectedChunks: 2, expectedSha256: hash(full) });
  assert.deepEqual(ledger.add(1, right, hash(right)), { complete: false, received: 1 });
  assert.deepEqual(ledger.add(1, right, hash(right)), { complete: false, received: 1 });
  assert.throws(() => ledger.add(0, left, 'wrong'), /checksum/);
  assert.deepEqual(ledger.add(0, left, hash(left)), { complete: true, bytes: full });
  assert.throws(() => ledger.add(2, right, hash(right)), /index/);
});

test('N013 safe storage paths accept children and reject traversal and NUL', () => {
  assert.equal(safeResolve('/var/app/files', '2026/a.csv'), '/var/app/files/2026/a.csv');
  assert.throws(() => safeResolve('/var/app/files', '../secrets'), /escapes/);
  assert.throws(() => safeResolve('/var/app/files', '/etc/passwd'), /relative/);
  assert.throws(() => safeResolve('/var/app/files', 'a\0b'), /relative/);
});

test('N014 per-account fixed windows enforce exact limit and reset boundary', () => {
  let now = 100;
  const allow = createRateLimiter({ limit: 2, windowMs: 50, now: () => now });
  assert.equal(allow('acct-1').allowed, true);
  assert.equal(allow('acct-1').remaining, 0);
  assert.equal(allow('acct-1').allowed, false);
  assert.equal(allow('acct-2').allowed, true);
  now = 150;
  assert.equal(allow('acct-1').allowed, true);
});

test('N015 concurrent payment retries share one operation and failures can retry', async () => {
  const store = createIdempotencyStore();
  let calls = 0;
  const charge = () => store('order-42', async () => { calls++; await new Promise((resolveWait) => setTimeout(resolveWait, 2)); return { receipt: 'r1' }; });
  assert.deepEqual(await Promise.all([charge(), charge()]), [{ receipt: 'r1' }, { receipt: 'r1' }]);
  assert.equal(calls, 1);
  await assert.rejects(store('retryable', () => { throw new Error('db down'); }), /db down/);
  assert.equal(await store('retryable', () => 'recovered'), 'recovered');
});

test('N016 single-flight cache coalesces concurrent reads and expires', async () => {
  let now = 0; let calls = 0;
  const cache = createSingleFlightCache({ ttlMs: 10, now: () => now });
  const load = () => cache('products', async () => { calls++; return ['keyboard']; });
  assert.deepEqual(await Promise.all([load(), load(), load()]), [['keyboard'], ['keyboard'], ['keyboard']]);
  assert.equal(calls, 1);
  now = 10;
  await load();
  assert.equal(calls, 2);
});

test('N017 webhook signature uses constant-time comparison and rejects stale timestamp', () => {
  const body = '{"invoice":"i-9"}'; const timestamp = 100_000; const secret = 'local-test-secret';
  const signature = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex');
  assert.equal(verifyWebhook({ body, timestamp, signature, secret, now: () => timestamp }), true);
  assert.equal(verifyWebhook({ body: '{}', timestamp, signature, secret, now: () => timestamp }), false);
  assert.equal(verifyWebhook({ body, timestamp, signature, secret, now: () => timestamp + 10_000, toleranceMs: 1_000 }), false);
});

test('N018 structured logger redacts credentials without mutating source event', () => {
  let output;
  const log = createJsonLogger((line) => { output = line; });
  const event = { requestId: 'q-1', Authorization: 'Bearer private', route: '/orders' };
  log(event);
  assert.deepEqual(JSON.parse(output), { requestId: 'q-1', Authorization: '[REDACTED]', route: '/orders' });
  assert.equal(event.Authorization, 'Bearer private');
});

test('N019 graceful shutdown drains active work and enforces its deadline', async (t) => {
  const draining = (await import('node:http')).createServer((_request, response) => setTimeout(() => response.end('drained'), 20));
  draining.listen(0, '127.0.0.1');
  await new Promise((resolveListen) => draining.once('listening', resolveListen));
  const responsePromise = fetch(`http://127.0.0.1:${draining.address().port}`);
  await new Promise((resolveRequest) => draining.once('request', resolveRequest));
  await gracefulClose(draining, { timeoutMs: 200 });
  assert.equal(await (await responsePromise).text(), 'drained');
  assert.equal(draining.listening, false);
  await gracefulClose(draining);

  const stuck = (await import('node:http')).createServer(() => {});
  stuck.listen(0, '127.0.0.1');
  await new Promise((resolveListen) => stuck.once('listening', resolveListen));
  const stuckResponse = fetch(`http://127.0.0.1:${stuck.address().port}`);
  await new Promise((resolveRequest) => stuck.once('request', resolveRequest));
  const closed = gracefulClose(stuck, { timeoutMs: 10 });
  await assert.rejects(stuckResponse);
  await closed;
  assert.equal(stuck.listening, false);
});

test('N020 build graph returns dependency-first order and reports a cycle', () => {
  const order = topologicalOrder({ app: ['view', 'model'], model: [], view: ['model'] });
  assert.ok(order.indexOf('model') < order.indexOf('view'));
  assert.ok(order.indexOf('view') < order.indexOf('app'));
  assert.throws(() => topologicalOrder({ a: ['b'], b: ['a'] }), /cycle/);
});

test('N021 package export conditions are explicit and hidden subpaths fail closed', () => {
  assert.equal(resolveExport({ '.': { import: './index.mjs', require: './index.cjs' } }, '.', ['node', 'import']), './index.mjs');
  assert.equal(resolveExport({ '.': { node: './node.js', import: './index.mjs' } }, '.', ['import', 'node']), './node.js');
  assert.throws(() => resolveExport({ '.': './index.js' }, './internal'), /not exported/);
  assert.throws(() => resolveExport({ '.': { browser: './browser.js' } }), /no export condition/);
});

test('N022 environment config validates range and keeps ephemeral port zero', () => {
  assert.deepEqual(parseServerConfig({ PORT: '0', HOST: ' localhost ' }), { port: 0, host: 'localhost' });
  assert.throws(() => parseServerConfig({ PORT: '70000' }), /PORT/);
  assert.throws(() => parseServerConfig({ PORT: '3.5' }), /PORT/);
});

test('N023 signed cursor round trips and rejects tampering', () => {
  const codec = createCursorCodec('cursor-secret');
  const token = codec.encode({ after: 'sku-8', tenant: 3 });
  assert.deepEqual(codec.decode(token), { after: 'sku-8', tenant: 3 });
  assert.throws(() => codec.decode(`${token.slice(0, -1)}x`), /signature/);
  assert.throws(() => codec.decode('../etc'), /malformed/);
});

test('N024 retry policy refuses non-idempotent POST and retries only a bounded 503', async () => {
  await assert.rejects(fetchWithRetry('http://unused', { method: 'POST' }), /idempotent/);
  let calls = 0;
  const response = await fetchWithRetry('http://unused', { attempts: 3, fetchImpl: async () => (++calls === 1 ? new Response('', { status: 503 }) : new Response('ok')) });
  assert.equal(await response.text(), 'ok');
  assert.equal(calls, 2);
});

test('N025 local fetch deadline aborts a server handler that never responds', async (t) => {
  const server = (await import('node:http')).createServer(() => {});
  server.listen(0, '127.0.0.1');
  await new Promise((resolveListen) => server.once('listening', resolveListen));
  t.after(() => gracefulClose(server, { timeoutMs: 25 }));
  const url = `http://127.0.0.1:${server.address().port}`;
  await assert.rejects(fetchWithDeadline(url, 20), (error) => error.name === 'TimeoutError' || error.name === 'AbortError');
});

test('N026 static file response supports ETag revalidation and path traversal denial', async (t) => {
  const directory = await scratch(t);
  await writeFile(resolve(directory, 'app.js'), 'console.log(1)');
  const respond = (headers = {}) => ({ req: { headers }, writeHead(status, responseHeaders = {}) { this.status = status; this.headers = responseHeaders; return this; }, end(body) { this.body = body; } });
  const first = respond();
  await serveStaticFile(directory, 'app.js', first);
  assert.equal(first.status, 200);
  const cached = respond({ 'if-none-match': first.headers.etag });
  await serveStaticFile(directory, 'app.js', cached);
  assert.equal(cached.status, 304);
  const escaped = respond();
  await serveStaticFile(directory, '../private', escaped);
  assert.equal(escaped.status, 400);
});

test('N027 onceEvent cleans listeners on event, error and abort', async () => {
  const emitter = new EventEmitter();
  const waiting = (await import('./labs.mjs')).onceEvent(emitter, 'ready');
  emitter.emit('ready', 'ok', 2);
  assert.deepEqual(await waiting, ['ok', 2]);
  assert.equal(emitter.listenerCount('ready'), 0);
  const controller = new AbortController();
  const cancelled = onceEvent(emitter, 'data', { signal: controller.signal });
  controller.abort(new Error('cancelled'));
  await assert.rejects(cancelled, /cancelled/);
  assert.equal(emitter.listenerCount('data'), 0);
});

test('N028 bounded queue caps queued work and rejects already-aborted tasks', async () => {
  const run = createBoundedQueue({ concurrency: 1, capacity: 1 });
  let release;
  const first = run(() => new Promise((resolveTask) => { release = resolveTask; }));
  await new Promise((resolveTick) => setImmediate(resolveTick));
  const controller = new AbortController();
  const cancelled = run(() => 'must not run', { signal: controller.signal });
  controller.abort(new Error('cancelled while queued'));
  await assert.rejects(cancelled, /cancelled while queued/);
  const second = run(() => 'second');
  await assert.rejects(run(() => 'overflow'), /full/);
  const alreadyCancelled = new AbortController(); alreadyCancelled.abort(new Error('already cancelled'));
  await assert.rejects(run(() => 'no', { signal: alreadyCancelled.signal }), /already cancelled/);
  release('first');
  assert.equal(await first, 'first');
  assert.equal(await second, 'second');
});

test('N029 atomic JSON state replaces existing content and leaves parseable JSON', async (t) => {
  const directory = await scratch(t); const path = resolve(directory, 'state/config.json');
  await atomicWriteJson(path, { revision: 1 });
  await atomicWriteJson(path, { revision: 2, enabled: true });
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), { revision: 2, enabled: true });
  await assert.rejects(atomicWriteJson(path, { invalid: 1n }), /BigInt/);
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), { revision: 2, enabled: true });
  assert.equal((await stat(path)).mode & 0o777, 0o600);
});

test('N030 chunk assembler publishes matching bytes and cleans failed staging file', async (t) => {
  const directory = await scratch(t); const path = resolve(directory, 'media/video.bin');
  const chunks = [Buffer.from('frame-1'), Buffer.from('frame-2')];
  const digest = createHash('sha256').update(Buffer.concat(chunks)).digest('hex');
  assert.deepEqual(await assembleChunks(chunks, path, digest), { bytes: 14, sha256: digest });
  assert.deepEqual(await readFile(path), Buffer.concat(chunks));
  const protectedPath = resolve(directory, 'media/bad.bin');
  await writeFile(protectedPath, 'old complete media');
  await assert.rejects(assembleChunks(chunks, protectedPath, 'bad'), /checksum/);
  assert.equal((await readFile(protectedPath)).toString(), 'old complete media');
  assert.equal((await readdir(resolve(directory, 'media'))).some((name) => name.endsWith('.assembling')), false);
});
