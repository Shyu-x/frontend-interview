import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { Worker } from 'node:worker_threads';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Readable, Transform } from 'node:stream';
import { finished, pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

// N001: A reusable worker_threads pool for CPU-bound batch totals.
export class WorkerPool {
  constructor({ size = 2, maxQueue = 32 } = {}) {
    if (!Number.isInteger(size) || size < 1 || size > 8) throw new RangeError('size must be 1..8');
    if (!Number.isInteger(maxQueue) || maxQueue < 0) throw new RangeError('maxQueue must be non-negative');
    this.size = size;
    this.maxQueue = maxQueue;
    this.queue = [];
    this.slots = [];
    this.nextId = 1;
    this.closing = false;
    this.idleWaiters = [];
    for (let index = 0; index < size; index++) this.#spawn(index);
  }

  #spawn(index) {
    const worker = new Worker(new URL('./workers/compute-worker.mjs', import.meta.url));
    const slot = { worker, index, current: null, failed: false };
    this.slots[index] = slot;
    worker.on('message', (message) => {
      if (!slot.current || message.id !== slot.current.id) return;
      const task = slot.current;
      slot.current = null;
      if (message.error) task.reject(Object.assign(new Error(message.error.message), { name: message.error.name }));
      else task.resolve(message.value);
      this.#dispatch();
      this.#notifyIdle();
    });
    worker.on('error', (error) => {
      // An errored Worker is not reusable even if exit has not fired yet.
      slot.failed = true;
      if (slot.current) slot.current.reject(error);
      slot.current = null;
      this.#notifyIdle();
    });
    worker.on('exit', (code) => {
      if (slot.current) slot.current.reject(new Error(`worker exited with code ${code}`));
      slot.current = null;
      if (!this.closing) this.#spawn(index);
      this.#dispatch();
      this.#notifyIdle();
    });
    this.#dispatch();
  }

  submit(operation, input) {
    if (this.closing) return Promise.reject(new Error('pool is closing'));
    if (!Array.isArray(input) || input.some((value) => !Number.isFinite(value))) {
      return Promise.reject(new TypeError('input must be an array of finite numbers'));
    }
    const idle = this.slots.some((slot) => slot && !slot.failed && slot.worker.threadId !== -1 && !slot.current);
    if (!idle && this.queue.length >= this.maxQueue) return Promise.reject(new Error('worker queue is full'));
    return new Promise((resolveTask, rejectTask) => {
      this.queue.push({ id: this.nextId++, operation, input, resolve: resolveTask, reject: rejectTask });
      this.#dispatch();
    });
  }

  #dispatch() {
    if (this.closing) return;
    for (const slot of this.slots) {
      if (this.queue.length === 0) break;
      if (!slot || slot.failed || slot.current || slot.worker.threadId === -1) continue;
      const task = this.queue.shift();
      slot.current = task;
      // Functions stay in the parent; only cloneable work data crosses the thread boundary.
      try {
        slot.worker.postMessage({ id: task.id, operation: task.operation, input: task.input });
      } catch (error) {
        // Structured-clone errors are synchronous; return the slot before rejecting.
        slot.current = null;
        task.reject(error);
        this.#dispatch();
        this.#notifyIdle();
      }
    }
  }

  #notifyIdle() {
    if (this.queue.length === 0 && this.slots.every((slot) => slot && !slot.current)) {
      for (const resolveIdle of this.idleWaiters.splice(0)) resolveIdle();
    }
  }

  close() {
    if (this.closePromise) return this.closePromise;
    this.closing = true;
    for (const task of this.queue.splice(0)) task.reject(new Error('pool closed before task started'));
    this.closePromise = (async () => {
      if (this.slots.some((slot) => slot?.current)) await new Promise((resolveIdle) => this.idleWaiters.push(resolveIdle));
      await Promise.all(this.slots.filter(Boolean).map(({ worker }) => worker.terminate()));
    })();
    return this.closePromise;
  }
}

// N002: Explicit transfer semantics for CPU output buffers; sender loses ownership.
export function transferBuffer(buffer) {
  // The transfer list detaches the sender's copy instead of doubling a large payload.
  if (!(buffer instanceof ArrayBuffer)) throw new TypeError('expected ArrayBuffer');
  const receiverOwned = structuredClone(buffer, { transfer: [buffer] });
  return receiverOwned;
}

// N003: A producer pauses when Writable.write() reports a full buffer.
export async function writeWithBackpressure(writable, chunks) {
  // Register completion listeners before writes, including custom Writable implementations that finish synchronously.
  const completion = finished(writable, { cleanup: true });
  try {
    for (const chunk of chunks) {
      // false is the producer's signal to pause until the consumer drains its buffer.
      if (!writable.write(chunk)) await Promise.race([once(writable, 'drain'), completion]);
    }
    writable.end();
    await completion;
  } catch (error) {
    // finished() observes sink errors that happen between write() and drain registration.
    if (!writable.destroyed) writable.destroy(error);
    await completion.catch(() => {});
    throw error;
  }
}

// N004: Compress a real file through pipeline so errors destroy every stage.
export async function gzipFile(source, destination) {
  // pipeline owns error propagation and destroys the other stages after a failure.
  await pipeline(createReadStream(source), createGzip(), createWriteStream(destination, { flags: 'wx' }));
  return destination;
}

// N005: Start an actual ephemeral HTTP server and return its address and close handle.
export async function startJsonServer(handler = () => ({ ok: true })) {
  const server = createServer(async (request, response) => {
    try {
      const result = await handler(request);
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(error.statusCode ?? 500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: error.message }));
    }
  });
  // Bound slow header/body senders so the local service cannot wait forever.
  server.requestTimeout = 5_000;
  server.headersTimeout = 2_000;
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

// N006: Compose async middleware with a guard against calling next() twice.
export function compose(middleware) {
  if (!Array.isArray(middleware) || middleware.some((fn) => typeof fn !== 'function')) throw new TypeError('middleware must be functions');
  return (context) => {
    let highest = -1;
    const dispatch = async (index) => {
      // A second next() would run downstream work twice and can send duplicate replies.
      if (index <= highest) throw new Error('next() called more than once');
      highest = index;
      const fn = middleware[index];
      if (fn) await fn(context, () => dispatch(index + 1));
    };
    return dispatch(0);
  };
}

// N007: Parse SSE frames even when a UTF-8 character or CRLF pair spans chunks.
export function createSseParser(onEvent) {
  // Streaming decode preserves a multi-byte character split across TCP chunks.
  const decoder = new TextDecoder();
  let pending = '';
  let data = [];
  let event = 'message';
  let id;
  const emitFrame = () => {
    if (data.length) onEvent({ data: data.join('\n'), event, id });
    data = [];
    event = 'message';
  };
  return {
    push(chunk) {
      pending += decoder.decode(chunk, { stream: true });
      const lines = pending.split(/\r?\n/);
      pending = lines.pop();
      for (const line of lines) {
        if (line === '') { emitFrame(); continue; }
        if (line.startsWith(':')) continue;
        const colon = line.indexOf(':');
        const field = colon < 0 ? line : line.slice(0, colon);
        const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
        if (field === 'data') data.push(value);
        if (field === 'event') event = value;
        if (field === 'id' && !value.includes('\0')) id = value;
      }
    },
    end() {
      pending += decoder.decode();
      if (pending) {
        if (pending.startsWith('data:')) data.push(pending.slice(5).replace(/^ /, ''));
      }
      emitFrame();
    },
  };
}

// N008: Write SSE events with framing and injection-safe field validation.
export function formatSse({ data, event, id, retry }) {
  if (typeof data !== 'string') throw new TypeError('data must be text');
  const safeField = (field, value) => {
    // Protocol fields are line-oriented, so embedded newlines would forge fields.
    if (value !== undefined && /[\r\n\0]/.test(String(value))) throw new TypeError(`${field} contains a line break`);
    return value;
  };
  safeField('event', event); safeField('id', id); safeField('retry', retry);
  const rows = [];
  if (event !== undefined) rows.push(`event: ${event}`);
  if (id !== undefined) rows.push(`id: ${id}`);
  if (retry !== undefined) {
    if (!Number.isInteger(retry) || retry < 0) throw new RangeError('retry must be a non-negative integer');
    rows.push(`retry: ${retry}`);
  }
  for (const line of data.split(/\r?\n/)) rows.push(`data: ${line}`);
  return `${rows.join('\n')}\n\n`;
}

// N009: Read JSON with a byte limit; Content-Length is advisory, bytes are authoritative.
export async function readJsonBody(request, { maxBytes = 64 * 1024 } = {}) {
  const parts = [];
  let total = 0;
  for await (const part of request) {
    const chunk = Buffer.from(part);
    // Count actual bytes: Content-Length can be missing or inaccurate.
    total += chunk.length;
    if (total > maxBytes) throw Object.assign(new Error('request body too large'), { statusCode: 413 });
    parts.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); }
  catch { throw Object.assign(new Error('invalid JSON body'), { statusCode: 400 }); }
}

// N010: Count in-flight requests and make disconnects observable for cancellation.
const trackedSignals = new WeakMap();
export function getTrackedSignal(request) { return trackedSignals.get(request); }

export function trackRequestLifecycle(server) {
  let active = 0;
  const controllers = new Set();
  server.on('request', (request, response) => {
    active++;
    const controller = new AbortController();
    controllers.add(controller);
    request.once('aborted', () => controller.abort(new Error('client aborted request')));
    // finish and close can both fire; deleting the controller makes decrement idempotent.
    response.once('finish', () => { active--; controllers.delete(controller); });
    response.once('close', () => {
      if (!response.writableFinished) controller.abort(new Error('response socket closed'));
      if (controllers.delete(controller)) active--;
    });
    // IncomingMessage.signal is a Node-owned getter; keep our app cancellation signal separately.
    trackedSignals.set(request, controller.signal);
  });
  return { get active() { return active; }, abortAll() { for (const controller of controllers) controller.abort(); } };
}

// N011: Stream an upload into a private temp file and publish only after success.
export async function atomicUpload(request, destination, { maxBytes = 1024 * 1024 } = {}) {
  const folder = resolve(destination, '..');
  await mkdir(folder, { recursive: true });
  const tempPath = resolve(folder, `.${basename(destination)}.${randomUUID()}.part`);
  // The hidden sibling stays unpublished until the entire source has passed the limit.
  let total = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      total += chunk.length;
      callback(total > maxBytes ? Object.assign(new Error('upload too large'), { statusCode: 413 }) : null, chunk);
    },
  });
  try {
    await pipeline(request, limiter, createWriteStream(tempPath, { flags: 'wx', mode: 0o600 }));
    await rename(tempPath, destination);
    return { bytes: total, destination };
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

// N012: Verify a chunk by digest before recording it; duplicate retries are safe.
export function createChunkLedger({ expectedChunks, expectedSha256 }) {
  if (!Number.isInteger(expectedChunks) || expectedChunks < 1) throw new RangeError('expectedChunks must be positive');
  const chunks = new Map();
  return {
    add(index, bytes, sha256) {
      if (!Number.isInteger(index) || index < 0 || index >= expectedChunks) throw new RangeError('chunk index out of range');
      const body = Buffer.from(bytes);
      const actual = createHash('sha256').update(body).digest('hex');
      // A client-supplied digest is only a claim; calculate it again on the server.
      if (actual !== sha256) throw new Error('chunk checksum mismatch');
      const old = chunks.get(index);
      if (old && !old.equals(body)) throw new Error('conflicting retry for chunk');
      chunks.set(index, body);
      if (chunks.size !== expectedChunks) return { complete: false, received: chunks.size };
      const joined = Buffer.concat(Array.from({ length: expectedChunks }, (_, part) => chunks.get(part)));
      const digest = createHash('sha256').update(joined).digest('hex');
      if (digest !== expectedSha256) throw new Error('whole-file checksum mismatch');
      return { complete: true, bytes: joined };
    },
  };
}

// N013: Resolve a user path below a trusted root and reject traversal/absolute paths.
export function safeResolve(root, userPath) {
  if (typeof userPath !== 'string' || userPath.includes('\0') || isAbsolute(userPath)) throw new TypeError('path must be a relative string');
  const base = resolve(root);
  const target = resolve(base, userPath);
  const escaped = relative(base, target);
  // relative() compares path components and avoids startsWith prefix confusion.
  if (escaped === '..' || escaped.startsWith(`..${sep}`) || isAbsolute(escaped)) throw new RangeError('path escapes storage root');
  return target;
}

// N014: Fixed-window per-customer limiter; clock injection makes boundary tests exact.
export function createRateLimiter({ limit, windowMs, now = Date.now }) {
  if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1) throw new RangeError('invalid limiter settings');
  const windows = new Map();
  return (key) => {
    // Per-key windows avoid coupling unrelated accounts that share one network address.
    const time = now();
    let state = windows.get(key);
    if (!state || time >= state.start + windowMs) state = { start: time, count: 0 };
    state.count++;
    windows.set(key, state);
    return { allowed: state.count <= limit, remaining: Math.max(0, limit - state.count), resetAt: state.start + windowMs };
  };
}

// N015: A single-process idempotency map coalesces duplicate calls during its TTL.
export function createIdempotencyStore({ ttlMs = 60_000, now = Date.now } = {}) {
  const entries = new Map();
  return async (key, operation) => {
    if (!key || typeof key !== 'string') throw new TypeError('idempotency key required');
    const existing = entries.get(key);
    if (existing && existing.expires > now()) return existing.promise;
    const promise = Promise.resolve().then(operation);
    // Publish the in-flight Promise before awaiting so concurrent retries join it.
    entries.set(key, { promise, expires: now() + ttlMs });
    try { return await promise; }
    catch (error) { if (entries.get(key)?.promise === promise) entries.delete(key); throw error; }
  };
}

// N016: Cache in-flight work so a burst of identical catalog misses causes one query.
export function createSingleFlightCache({ ttlMs = 1_000, now = Date.now } = {}) {
  const entries = new Map();
  return async (key, load) => {
    const entry = entries.get(key);
    if (entry && entry.expires > now()) return entry.promise;
    const promise = Promise.resolve().then(load);
    // Cache the pending load itself to collapse simultaneous misses.
    entries.set(key, { promise, expires: now() + ttlMs });
    try { return await promise; }
    catch (error) { if (entries.get(key)?.promise === promise) entries.delete(key); throw error; }
  };
}

// N017: Verify signed webhooks and reject timestamps outside the replay window.
export function verifyWebhook({ body, timestamp, signature, secret, now = Date.now, toleranceMs = 5 * 60_000 }) {
  if (!Number.isFinite(timestamp) || Math.abs(now() - timestamp) > toleranceMs) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest();
  let provided;
  try { provided = Buffer.from(signature, 'hex'); } catch { return false; }
  // timingSafeEqual requires equal-size buffers and avoids content-dependent comparison time.
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

// N018: JSON logger redacts credential fields before serializing an event.
export function createJsonLogger(write, { redact = ['authorization', 'cookie', 'token'] } = {}) {
  const hidden = new Set(redact.map((key) => key.toLowerCase()));
  return (event) => {
    // Copy before redaction so logging cannot mutate request state owned by another layer.
    const clean = {};
    for (const [key, value] of Object.entries(event)) clean[key] = hidden.has(key.toLowerCase()) ? '[REDACTED]' : value;
    write(JSON.stringify(clean));
  };
}

// N019: Stop accepting work, drain active requests, then close idle keep-alive sockets.
export async function gracefulClose(server, { timeoutMs = 1_000 } = {}) {
  if (!server.listening) return;
  const closed = new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
  // Idle keep-alive sockets should not hold deployment shutdown open.
  server.closeIdleConnections?.();
  const timeout = setTimeout(() => server.closeAllConnections?.(), timeoutMs);
  timeout.unref?.();
  try { await closed; } finally { clearTimeout(timeout); }
}

// N020: Build systems need deterministic dependency ordering and useful cycle errors.
export function topologicalOrder(graph) {
  const temporary = new Set();
  const permanent = new Set();
  const output = [];
  const visit = (node) => {
    if (permanent.has(node)) return;
    // temporary tracks the current DFS path; a back-edge is a dependency cycle.
    if (temporary.has(node)) throw new Error(`dependency cycle at ${node}`);
    temporary.add(node);
    for (const dependency of graph[node] ?? []) visit(dependency);
    temporary.delete(node);
    permanent.add(node);
    output.push(node);
  };
  for (const node of Object.keys(graph).sort()) visit(node);
  return output;
}

// N021: Resolve package exports by explicit environment condition priority.
export function resolveExport(exportsMap, subpath = '.', conditions = ['node', 'import', 'default']) {
  const target = exportsMap[subpath];
  if (typeof target === 'string') return target;
  if (!target || typeof target !== 'object') throw new Error(`package subpath not exported: ${subpath}`);
  // Node checks active conditions in the export object's declared key order.
  const activeConditions = new Set(conditions);
  for (const [condition, value] of Object.entries(target)) {
    if (activeConditions.has(condition) && typeof value === 'string') return value;
  }
  throw new Error(`no export condition matched for ${subpath}`);
}

// N022: Parse deployment config once and reject invalid ports instead of coercing silently.
export function parseServerConfig(env) {
  // Number plus an integer/range check rejects values parseInt would silently truncate.
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new RangeError('PORT must be an integer from 0 to 65535');
  const host = env.HOST ?? '127.0.0.1';
  if (typeof host !== 'string' || !host.trim()) throw new TypeError('HOST must be non-empty');
  return { port, host: host.trim() };
}

// N023: Sign pagination cursors so clients cannot skip into arbitrary database ranges.
export function createCursorCodec(secret) {
  return {
    encode(payload) {
      const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const mac = createHmac('sha256', secret).update(body).digest('base64url');
      return `${body}.${mac}`;
    },
    decode(cursor) {
      if (typeof cursor !== 'string' || !/^[\w-]+\.[\w-]+$/.test(cursor)) throw new TypeError('malformed cursor');
      const [body, mac] = cursor.split('.');
      // Verify integrity before trusting or parsing any cursor field.
      const expected = createHmac('sha256', secret).update(body).digest();
      const actual = Buffer.from(mac, 'base64url');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('invalid cursor signature');
      return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    },
  };
}

// N024: Retry only safe methods and replayable bodies, respecting a bounded attempt count.
export async function fetchWithRetry(url, { method = 'GET', attempts = 2, fetchImpl = fetch, delay = async () => {} } = {}) {
  // A timed-out write may already have committed; only retry methods safe to replay.
  if (!['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'].includes(method.toUpperCase())) throw new TypeError('automatic retry requires an idempotent method');
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 5) throw new RangeError('attempts must be 1..5');
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetchImpl(url, { method });
      if (response.status < 500 || attempt === attempts - 1) return response;
      lastError = new Error(`retryable HTTP ${response.status}`);
      // Release the old response body before opening the next attempt.
      await response.body?.cancel();
    } catch (error) { lastError = error; if (attempt === attempts - 1) throw error; }
    await delay(attempt);
  }
  throw lastError;
}

// N025: Bound downstream request time and propagate cancellation into fetch().
export async function fetchWithDeadline(url, milliseconds, options = {}) {
  if (!Number.isFinite(milliseconds) || milliseconds < 1) throw new RangeError('deadline must be positive');
  // AbortSignal cancels transport work itself; racing promises alone would leave it running.
  const signal = AbortSignal.any([options.signal, AbortSignal.timeout(milliseconds)].filter(Boolean));
  return fetch(url, { ...options, signal });
}

// N026: Serve a file with a stable ETag and reject traversal before touching disk.
export async function serveStaticFile(root, requestPath, response) {
  let target;
  try { target = safeResolve(root, decodeURIComponent(requestPath)); }
  catch { response.writeHead(400).end(); return; }
  try {
    const body = await readFile(target);
    // Content-derived validators let a client revalidate without downloading unchanged bytes.
    const etag = `"${createHash('sha256').update(body).digest('hex')}"`;
    if (response.req.headers['if-none-match'] === etag) { response.writeHead(304, { etag }).end(); return; }
    response.writeHead(200, { etag, 'content-length': body.length, 'content-type': 'application/octet-stream' }).end(body);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
  }
}

// N027: One-shot event subscription removes listeners after success, failure, or abort.
export function onceEvent(emitter, eventName, { signal } = {}) {
  if (signal?.aborted) return Promise.reject(signal.reason ?? new Error('aborted'));
  return new Promise((resolveEvent, rejectEvent) => {
    // Every terminal path shares cleanup so long-lived emitters do not retain listeners.
    const cleanup = () => { emitter.removeListener(eventName, onEvent); emitter.removeListener('error', onError); signal?.removeEventListener('abort', onAbort); };
    const onEvent = (...values) => { cleanup(); resolveEvent(values); };
    const onError = (error) => { cleanup(); rejectEvent(error); };
    const onAbort = () => { cleanup(); rejectEvent(signal.reason ?? new Error('aborted')); };
    emitter.once(eventName, onEvent);
    if (eventName !== 'error') emitter.once('error', onError);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

// N028: Queue bounded work and let a queued caller withdraw before execution.
export function createBoundedQueue({ concurrency = 2, capacity = 16 } = {}) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || !Number.isInteger(capacity) || capacity < 0) throw new RangeError('invalid queue limits');
  let running = 0;
  const waiting = [];
  const pump = () => {
    while (running < concurrency && waiting.length) {
      const item = waiting.shift();
      item.signal?.removeEventListener('abort', item.onAbort);
      if (item.signal?.aborted) { item.reject(item.signal.reason ?? new Error('aborted')); continue; }
      running++;
      Promise.resolve().then(item.work).then(item.resolve, item.reject).finally(() => { running--; pump(); });
    }
  };
  return (work, { signal } = {}) => {
    if (typeof work !== 'function') return Promise.reject(new TypeError('work must be a function'));
    if (signal?.aborted) return Promise.reject(signal.reason ?? new Error('aborted'));
    if (running >= concurrency && waiting.length >= capacity) return Promise.reject(new Error('queue is full'));
    return new Promise((resolveTask, rejectTask) => {
      const item = { work, signal, resolve: resolveTask, reject: rejectTask };
      item.onAbort = () => {
        const index = waiting.indexOf(item);
        if (index !== -1) waiting.splice(index, 1);
        rejectTask(signal.reason ?? new Error('aborted'));
      };
      signal?.addEventListener('abort', item.onAbort, { once: true });
      waiting.push(item);
      pump();
    });
  };
}

// N029: Atomically replace a JSON state file; readers see either old or new contents.
export async function atomicWriteJson(path, value) {
  const directory = resolve(path, '..');
  await mkdir(directory, { recursive: true });
  const temporary = resolve(directory, `.${basename(path)}.${randomUUID()}.tmp`);
  try {
    // A same-directory rename publishes a complete file instead of exposing partial JSON.
    await writeFile(temporary, JSON.stringify(value), { flag: 'wx', mode: 0o600 });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

// N030: Accept resumable chunks and publish a complete file only after final digest check.
export async function assembleChunks(chunks, destination, expectedSha256) {
  const directory = resolve(destination, '..');
  await mkdir(directory, { recursive: true });
  const temporary = resolve(directory, `.${basename(destination)}.${randomUUID()}.assembling`);
  try {
    let bytes = 0;
    const hash = createHash('sha256');
    const meter = new Transform({
      transform(chunk, _encoding, callback) {
        // Hash while streaming so large assembled files are never concatenated in RAM.
        bytes += chunk.length;
        hash.update(chunk);
        callback(null, chunk);
      },
    });
    await pipeline(
      Readable.from(chunks.map((chunk) => Buffer.from(chunk))),
      meter,
      createWriteStream(temporary, { flags: 'wx', mode: 0o600 }),
    );
    const actual = hash.digest('hex');
    if (actual !== expectedSha256) throw new Error('assembled checksum mismatch');
    await rename(temporary, destination);
    return { bytes, sha256: actual };
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

// Exposed only for tests that need a unique scratch directory; callers own its cleanup.
export async function makeScratchDirectory(prefix = 'node-lab-') {
  return mkdtemp(resolve(tmpdir(), prefix));
}
