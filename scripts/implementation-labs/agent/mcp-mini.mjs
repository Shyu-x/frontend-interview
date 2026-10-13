import { createServer } from 'node:http';
import { StringDecoder } from 'node:string_decoder';

export const VERSION = '2026-07-28';
export const META_VERSION = 'io.modelcontextprotocol/protocolVersion';
export const META_CAPS = 'io.modelcontextprotocol/clientCapabilities';
export const MCP_ERRORS = Object.freeze({ headerMismatch: -32020, missingCapability: -32021, unsupportedVersion: -32022 });

// 1. Build per-request metadata; a socket is never treated as a negotiated session.
export function requestMeta(clientCapabilities = {}) {
  return { [META_VERSION]: VERSION, [META_CAPS]: clientCapabilities };
}

// 2. Build a complete JSON-RPC envelope with required metadata in params.
export function makeRequest(id, method, params = {}, clientCapabilities = {}) {
  if (!Number.isSafeInteger(id) && typeof id !== 'string') throw new TypeError('MCP request id must be a string or safe integer');
  return { jsonrpc: '2.0', id, method, params: { ...params, _meta: requestMeta(clientCapabilities) } };
}

// 20. Correlate concurrent RPC calls, enforce per-call deadlines, and fail pending work on close.
export class RpcClient {
  #send;
  #pending = new Map();
  #nextId = 0;
  #closed = false;
  constructor(send) { this.#send = send; }
  request(method, params = {}, { timeoutMs = 1000, clientCapabilities = {} } = {}) {
    if (this.#closed) return Promise.reject(new Error('RPC client is closed'));
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return Promise.reject(new RangeError('timeoutMs must be finite and positive'));
    const id = ++this.#nextId;
    const message = makeRequest(id, method, params, clientCapabilities);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        const error = new Error(`RPC request ${id} timed out`);
        error.name = 'TimeoutError';
        reject(error);
      }, timeoutMs);
      this.#pending.set(id, { resolve, reject, timer });
      try { this.#send(message); }
      catch (error) { clearTimeout(timer); this.#pending.delete(id); reject(error); }
    });
  }
  accept(message) {
    if (!message || typeof message !== 'object' || Array.isArray(message) || message.jsonrpc !== '2.0' || !('id' in message)) return false;
    const pending = this.#pending.get(message.id);
    if (!pending) return false;
    this.#pending.delete(message.id);
    clearTimeout(pending.timer);
    const hasError = Object.hasOwn(message, 'error');
    const hasResult = Object.hasOwn(message, 'result');
    if (hasError === hasResult) { pending.reject(new Error('Malformed JSON-RPC response: expected exactly one result or error')); return true; }
    if (hasError) {
      const error = message.error;
      if (!error || typeof error !== 'object' || !Number.isInteger(error.code) || typeof error.message !== 'string') {
        pending.reject(new Error('Malformed JSON-RPC error object'));
      } else pending.reject(Object.assign(new Error(error.message), { code: error.code, data: error.data }));
      return true;
    }
    const result = message.result;
    if (!result || typeof result !== 'object' || Array.isArray(result) || result.resultType !== 'complete') {
      pending.reject(new Error('Unsupported or malformed MCP result; this client subset accepts resultType complete only'));
      return true;
    }
    pending.resolve(result);
    return true;
  }
  close(reason = new Error('RPC client closed')) {
    if (this.#closed) return;
    this.#closed = true;
    for (const [id, pending] of this.#pending) {
      clearTimeout(pending.timer);
      pending.reject(Object.assign(new Error(reason.message), { requestId: id }));
    }
    this.#pending.clear();
  }
  get pendingCount() { return this.#pending.size; }
}

// 3. Use a short deterministic descriptor set and cache policy for discovery.
export const TOOL_LIST = Object.freeze([
  { name: 'sum', description: 'Add two finite numbers', inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'], additionalProperties: false } },
]);

// 4. Dispatch the teaching subset. Every result names its result type.
export function dispatch(message) {
  const readableId = message && (typeof message.id === 'string' || Number.isSafeInteger(message.id)) ? { id: message.id } : {};
  const fail = (code, text, data) => ({ jsonrpc: '2.0', ...readableId, error: { code, message: text, ...(data ? { data } : {}) } });
  if (!message || typeof message !== 'object' || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || !message.method) return fail(-32600, 'Invalid Request');
  if ('id' in message && (message.id === null || (typeof message.id !== 'string' && !Number.isSafeInteger(message.id)))) return fail(-32600, 'Invalid Request');
  if (message.params !== undefined && (!message.params || typeof message.params !== 'object' || Array.isArray(message.params))) return fail(-32600, 'Invalid Request');
  const params = message.params ?? {};
  if (!('id' in message)) return null; // Notifications do not carry request _meta and never receive replies.
  const meta = params._meta;
  if (!meta || typeof meta[META_VERSION] !== 'string' || !meta[META_CAPS] || typeof meta[META_CAPS] !== 'object' || Array.isArray(meta[META_CAPS])) return fail(-32602, 'Required per-request metadata is missing');
  if (meta[META_VERSION] !== VERSION) return fail(MCP_ERRORS.unsupportedVersion, 'Unsupported protocol version', { supported: [VERSION], requested: meta[META_VERSION] });
  let result;
  switch (message.method) {
    case 'server/discover':
      result = { resultType: 'complete', supportedVersions: [VERSION], capabilities: { tools: {}, resources: {}, prompts: {} }, _meta: { 'io.modelcontextprotocol/serverInfo': { name: 'mini-agent-server', version: '1.0.0' } }, ttlMs: 60_000, cacheScope: 'public' };
      break;
    case 'tools/list':
      result = { resultType: 'complete', tools: TOOL_LIST, ttlMs: 1000, cacheScope: 'public' };
      break;
    case 'tools/call': {
      if (params.name !== 'sum') return fail(-32602, 'Unknown tool');
      if (!params.arguments || typeof params.arguments !== 'object' || Array.isArray(params.arguments)) return fail(-32602, 'arguments must be an object');
      const { a, b } = params.arguments;
      const sum = a + b;
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(sum) || Object.keys(params.arguments ?? {}).some((key) => !['a', 'b'].includes(key))) return fail(-32602, 'arguments must contain only finite a and b numbers whose sum is finite');
      result = { resultType: 'complete', content: [{ type: 'text', text: String(sum) }], structuredContent: { value: sum }, isError: false };
      break;
    }
    case 'demo/needs-elicitation':
      if (!meta[META_CAPS].elicitation?.form) return fail(MCP_ERRORS.missingCapability, 'Client did not declare elicitation/form capability', { requiredCapabilities: { elicitation: { form: {} } } });
      result = { resultType: 'complete', note: 'This fixture checks the capability gate only; it does not implement MRTR.' };
      break;
    case 'resources/list': result = { resultType: 'complete', resources: [], ttlMs: 1000, cacheScope: 'public' }; break;
    case 'prompts/list': result = { resultType: 'complete', prompts: [], ttlMs: 1000, cacheScope: 'public' }; break;
    default: return fail(-32601, 'Method not found');
  }
  return { jsonrpc: '2.0', id: message.id, result };
}

// 5. Validate the routing headers mirrored from a request body before dispatch.
export function validateHttpHeaders(headers, body) {
  const methodHeader = headers['mcp-method'];
  const versionHeader = headers['mcp-protocol-version'];
  const expectedName = body.params?.name ?? body.params?.uri;
  const nameHeader = headers['mcp-name'];
  if (methodHeader !== body.method || versionHeader !== body.params?._meta?.[META_VERSION]) return false;
  if (expectedName !== undefined && nameHeader !== expectedName) return false;
  if (expectedName === undefined && nameHeader !== undefined) return false;
  return true;
}

// 21. Make a real Streamable HTTP POST and verify both HTTP and JSON-RPC correlation.
export async function callMcpHttp(endpoint, method, params = {}, id = 1, { fetchImpl = fetch, signal, clientCapabilities = {} } = {}) {
  const body = makeRequest(id, method, params, clientCapabilities);
  const name = body.params.name ?? body.params.uri;
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    'mcp-protocol-version': VERSION,
    'mcp-method': method,
  };
  if (name !== undefined) headers['mcp-name'] = String(name);
  const response = await fetchImpl(endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal });
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.split(';', 1)[0].trim().toLowerCase() !== 'application/json') throw new Error(`unexpected MCP response Content-Type: ${contentType}`);
  const message = await response.json();
  if (message.jsonrpc !== '2.0' || message.id !== id) throw new Error('MCP response id or JSON-RPC version mismatch');
  if (!response.ok || message.error) throw Object.assign(new Error(message.error?.message ?? `MCP HTTP status ${response.status}`), { code: message.error?.code, status: response.status, data: message.error?.data });
  if (!Object.hasOwn(message, 'result') || Object.hasOwn(message, 'error')) throw new Error('MCP response must contain exactly one result');
  if (message.result?.resultType !== 'complete') throw new Error('MCP response resultType is not supported by this JSON-only client');
  return message.result;
}

// 6. Serve one JSON-RPC request per HTTP POST, without session identifiers.
export function createMcpHttpServer() {
  return createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405, { allow: 'POST' }).end(); return; }
    if (req.headers['content-type']?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') { res.writeHead(415).end(); return; }
    const acceptedTypes = typeof req.headers.accept === 'string' ? req.headers.accept.split(',').map((type) => type.trim().split(';')[0].toLowerCase()) : [];
    if (!acceptedTypes.includes('application/json') || !acceptedTypes.includes('text/event-stream')) { res.writeHead(406).end(); return; }
    if (req.headers.origin) {
      try { if (!['http://localhost', 'http://127.0.0.1'].includes(new URL(req.headers.origin).origin)) { res.writeHead(403).end(); return; } }
      catch { res.writeHead(403).end(); return; }
    }
    const decoder = new StringDecoder('utf8');
    let text = '';
    try {
      for await (const chunk of req) { text += decoder.write(chunk); if (Buffer.byteLength(text) > 64 * 1024) { res.writeHead(413).end(); return; } }
      text += decoder.end();
      const body = JSON.parse(text);
      const envelope = dispatch(body);
      if (!envelope) { res.writeHead(400).end(); return; } // HTTP transport in this subset accepts requests only, not client notifications.
      if (envelope.error?.code === -32600 || envelope.error?.code === -32602) {
        res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify(envelope));
        return;
      }
      if (!validateHttpHeaders(req.headers, body)) {
        const readableId = typeof body.id === 'string' || Number.isSafeInteger(body.id) ? { id: body.id } : {};
        res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', ...readableId, error: { code: MCP_ERRORS.headerMismatch, message: 'HTTP headers disagree with JSON-RPC body' } }));
        return;
      }
      if (req.headers['mcp-protocol-version'] === undefined) { res.writeHead(400).end(); return; }
      const status = envelope.error?.code === -32601 ? 404 : envelope.error ? 400 : 200;
      res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(envelope));
    } catch {
      res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }));
    }
  });
}

// 7. Frame stdio by newline while preserving UTF-8 split across OS chunks.
export function createLineDecoder(onLine, maxBytes = 64 * 1024) {
  const decoder = new StringDecoder('utf8');
  let pending = '';
  return {
    push(chunk) {
      pending += decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      let newline;
      while ((newline = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, newline).replace(/\r$/, '');
        pending = pending.slice(newline + 1);
        if (Buffer.byteLength(line) > maxBytes) throw new RangeError('stdio frame exceeds configured limit');
        if (line.length) onLine(line);
      }
      if (Buffer.byteLength(pending) > maxBytes) throw new RangeError('stdio frame exceeds configured limit');
    },
    end() { pending += decoder.end(); if (pending.length) throw new SyntaxError('unterminated stdio frame'); },
  };
}

// 8. Keep protocol stdout clean: diagnostics are written to stderr.
export function runStdio(input = process.stdin, output = process.stdout) {
  const decoder = createLineDecoder((line) => {
    let response;
    try { response = dispatch(JSON.parse(line)); }
    catch { response = { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }; }
    if (response !== null) output.write(`${JSON.stringify(response)}\n`);
  });
  input.on('data', (chunk) => { try { decoder.push(chunk); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; input.destroy(); } });
  input.on('end', () => { try { decoder.end(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; } });
}

// 9. Cache list responses only within the server-provided scope and TTL.
export function cacheEntry(result, now = Date.now()) {
  const { ttlMs, cacheScope } = result;
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 0 || !['public', 'private'].includes(cacheScope)) throw new TypeError('invalid MCP cache policy');
  return { value: result, scope: cacheScope, expiresAt: now + ttlMs };
}

// 10. Derive a stable local cache key that includes caller identity when needed.
export function cacheKey(serverIdentity, method, params, scope, principal = '') {
  if (typeof serverIdentity !== 'string' || !serverIdentity) throw new TypeError('cache key requires server identity');
  if (!['public', 'private'].includes(scope)) throw new TypeError('unknown MCP cache scope');
  if (scope === 'private' && !principal) throw new TypeError('private cache keys require a principal');
  const body = JSON.stringify([serverIdentity, method, params, scope === 'public' ? '' : principal]);
  return body;
}

// 11. Gate tools at the host boundary; server annotations are not authorization.
export async function invokeWithApproval(tool, args, approve, execute) {
  if (!await approve({ name: tool, args })) return { ok: false, reason: 'denied' };
  return { ok: true, value: await execute(args) };
}

// 12. Deduplicate retrieval candidates by canonical document id before reranking.
export function dedupeCandidates(candidates) {
  const best = new Map();
  for (const item of candidates) {
    if (!item || typeof item.id !== 'string' || !Number.isFinite(item.score)) continue;
    const old = best.get(item.id);
    if (!old || item.score > old.score) best.set(item.id, item);
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

// 13. Run an agent loop with a separate turn budget and a terminal final answer.
export async function runAgentLoop({ model, tools, maxTurns = 4, signal }) {
  if (!Number.isSafeInteger(maxTurns) || maxTurns < 1) throw new RangeError('maxTurns must be a positive integer');
  const transcript = [];
  for (let turn = 0; turn < maxTurns; turn += 1) {
    signal?.throwIfAborted();
    const reply = await model(transcript, signal);
    transcript.push({ ...reply, role: 'assistant' }); // The adapter, not model data, owns the role.
    if (!reply.toolCalls?.length) return { reason: 'final', transcript, turns: turn + 1 };
    for (const call of reply.toolCalls) {
      signal?.throwIfAborted();
      const handler = tools instanceof Map ? tools.get(call.name) : Object.hasOwn(tools, call.name) ? tools[call.name] : undefined;
      transcript.push({ role: 'tool', callId: call.id, output: handler ? await handler(call.arguments, signal) : { error: 'unknown tool' } });
    }
  }
  return { reason: 'turn_budget', transcript, turns: maxTurns };
}

// 14. Keep token and call budgets independent so one cannot mask the other.
export function consumeBudget(current, delta, limits) {
  for (const value of [...Object.values(current), ...Object.values(delta), ...Object.values(limits)]) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('budget values must be finite nonnegative numbers');
  }
  const next = { turns: current.turns + (delta.turns ?? 0), calls: current.calls + (delta.calls ?? 0), tokens: current.tokens + (delta.tokens ?? 0) };
  const reason = next.turns > limits.turns ? 'turn_budget' : next.calls > limits.calls ? 'tool_budget' : next.tokens > limits.tokens ? 'token_budget' : null;
  return { next, reason };
}

// 15. Serialize validated snapshots with a nonnegative revision. Monotonic
// updates and durable conditional commits are the storage layer's job.
export function saveSessionSnapshot(snapshot) {
  if (!snapshot || typeof snapshot.sessionId !== 'string' || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 || !Array.isArray(snapshot.messages) || !snapshot.messages.every((message) => message && typeof message.role === 'string')) throw new TypeError('invalid session snapshot');
  return JSON.stringify({ ...snapshot, version: 1 });
}

// 16. Restore a session only when schema version and message history are valid.
export function restoreSessionSnapshot(serialized) {
  const value = JSON.parse(serialized);
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || typeof value.sessionId !== 'string' || !Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.messages) || !value.messages.every((message) => message && typeof message.role === 'string')) throw new TypeError('unsupported or invalid session snapshot');
  return value;
}

// 17. Bound fan-out, preserve result ordering, and collect failures per worker.
export async function mapWithLimit(items, limit, worker) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer');
  const results = new Array(items.length);
  let cursor = 0;
  async function drain() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try { results[index] = { ok: true, value: await worker(items[index], index) }; }
      catch (error) {
        let message;
        try { message = error instanceof Error ? error.message : String(error); }
        catch { message = 'Unprintable thrown value'; }
        results[index] = { ok: false, error: message };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, drain));
  return results;
}

// 18. Reject duplicate or untrusted plugin names before exposing handlers.
export function registerPlugin(registry, manifest, handler) {
  if (!manifest || !/^[a-z][a-z0-9-]{1,40}$/.test(manifest.id) || !Array.isArray(manifest.permissions) || typeof handler !== 'function') throw new TypeError('invalid plugin manifest');
  if (registry.has(manifest.id)) throw new Error(`plugin already registered: ${manifest.id}`);
  registry.set(manifest.id, { manifest: structuredClone(manifest), handler });
  return registry;
}

// 19. Race long-running work against cancellation and always detach the listener.
export function raceWithAbort(operation, signal) {
  if (signal?.aborted) return Promise.reject(signal.reason ?? new Error('aborted'));
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      callback(value);
    };
    const onAbort = () => finish(reject, signal.reason ?? new Error('aborted'));
    signal?.addEventListener('abort', onAbort, { once: true });
    Promise.resolve(operation).then((value) => finish(resolve, value), (error) => finish(reject, error));
  });
}
