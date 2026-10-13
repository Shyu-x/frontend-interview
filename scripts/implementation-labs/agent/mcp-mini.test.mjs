import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import {
  VERSION, META_CAPS, MCP_ERRORS, makeRequest, dispatch, validateHttpHeaders,
  createMcpHttpServer, createLineDecoder, cacheEntry, cacheKey,
  invokeWithApproval, dedupeCandidates, runAgentLoop, consumeBudget,
  saveSessionSnapshot, restoreSessionSnapshot, mapWithLimit, registerPlugin,
  raceWithAbort, RpcClient, callMcpHttp,
} from './mcp-mini.mjs';

let checks = 0;
function check(actual, expected, message) { test(message, () => assert.deepEqual(actual, expected)); checks += 1; }
function request(method, params = {}, caps = {}, id = 1) { return makeRequest(id, method, params, caps); }

const discovery = dispatch(request('server/discover'));
check(discovery.result.supportedVersions, [VERSION], 'discover lists supported versions');
check(discovery.result.resultType, 'complete', 'successful results identify completion');
check(discovery.result.capabilities.tools !== undefined, true, 'discover exposes tools capability');
check(discovery.result.ttlMs, 60000, 'discover response can be cached for its TTL');
check(discovery.result.cacheScope, 'public', 'discover response declares cache scope');
check(discovery.result._meta['io.modelcontextprotocol/serverInfo'].name, 'mini-agent-server', 'server identity is carried in result metadata');
check(discovery.id, 1, 'request id is echoed');
check(discovery.jsonrpc, '2.0', 'response remains JSON-RPC 2.0');
check(Object.hasOwn(discovery, 'error'), false, 'valid request has no error');

const list = dispatch(request('tools/list'));
check(list.result.tools.length, 1, 'tools/list returns one teaching tool');
check(list.result.ttlMs, 1000, 'tool list includes a server TTL');
check(list.result.cacheScope, 'public', 'tool list explicitly states cache scope');
check(list.result.tools[0].name, 'sum', 'tool list is deterministic');
check(dispatch(request('resources/list')).result.ttlMs, 1000, 'resources/list includes cache TTL');
check(dispatch(request('resources/list')).result.cacheScope, 'public', 'resources/list includes cache scope');
check(dispatch(request('prompts/list')).result.ttlMs, 1000, 'prompts/list includes cache TTL');
check(dispatch(request('prompts/list')).result.cacheScope, 'public', 'prompts/list includes cache scope');

const sum = dispatch(request('tools/call', { name: 'sum', arguments: { a: 2, b: 3 } }));
check(sum.result.structuredContent.value, 5, 'tool computes numeric result');
check(sum.result.content[0].text, '5', 'tool returns readable text content');
check(sum.result.isError, false, 'successful tool result is not marked error');
check(sum.result.resultType, 'complete', 'tool result identifies completion');
check(dispatch(request('tools/call', { name: 'missing', arguments: {} })).error.code, -32602, 'unknown tool is invalid params');
check(dispatch(request('tools/call', { name: 'sum', arguments: { a: '2', b: 3 } })).error.code, -32602, 'invalid argument is rejected');
check(dispatch(request('tools/call', { name: 'sum', arguments: { a: Infinity, b: 3 } })).error.code, -32602, 'nonfinite number is rejected');
check(dispatch(request('tools/call', { name: 'sum', arguments: { a: 1, b: 2, c: 3 } })).error.code, -32602, 'additional tool arguments are rejected');
check(dispatch(request('tools/call', { name: 'sum', arguments: { a: 2, b: 3 } }, {}, 9)).result.structuredContent.value, 5, 'tool is a server capability and does not require a client tools flag');
check(dispatch(request('demo/needs-elicitation', {}, {}, 10)).error.code, MCP_ERRORS.missingCapability, 'missing elicitation/form capability is rejected');
check(dispatch(request('demo/needs-elicitation', {}, {}, 10)).error.data.requiredCapabilities.elicitation.form !== undefined, true, 'capability error names the missing form capability');
check(dispatch(request('demo/needs-elicitation', {}, { elicitation: { form: {} } })).result.note.includes('does not implement MRTR'), true, 'capability fixture does not claim to implement MRTR');

check(dispatch({ jsonrpc: '1.0', id: 1, method: 'server/discover', params: {} }).error.code, -32600, 'wrong JSON-RPC version is rejected');
check(dispatch({ jsonrpc: '2.0', method: 'notifications/cancelled', params: {} }), null, 'well-formed notification needs no request metadata and receives no response');
check(dispatch({ jsonrpc: '2.0', id: 2, method: 'server/discover', params: {} }).error.code, -32602, 'missing per-request metadata is rejected');
check(dispatch({ jsonrpc: '2.0', id: null, method: 'server/discover', params: request('x').params }).error.code, -32600, 'null id is invalid');
check(dispatch({ jsonrpc: '2.0', id: 1.5, method: 'server/discover', params: request('x').params }).error.code, -32600, 'fractional id is invalid');
check(dispatch([{ jsonrpc: '2.0', id: 1, method: 'server/discover' }]).error.code, -32600, 'top-level batch arrays are rejected');
check(dispatch({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: 'oops' }).error.code, -32600, 'primitive params are rejected');
const oldVersion = request('server/discover');
oldVersion.params._meta['io.modelcontextprotocol/protocolVersion'] = '2025-11-25';
check(dispatch(oldVersion).error.code, MCP_ERRORS.unsupportedVersion, 'old version returns allocated version error');
check(dispatch(oldVersion).error.data.requested, '2025-11-25', 'version error names requested version');
check(dispatch({ jsonrpc: '2.0', id: 1, method: 'missing', params: request('x').params }).error.code, -32601, 'unknown method is method-not-found');
assert.throws(() => makeRequest(null, 'tools/list'), TypeError); checks += 1;
check(Object.keys(request('x').params._meta[META_CAPS]).length, 0, 'empty capabilities accurately means client declares no optional capabilities');

const valid = request('tools/call', { name: 'sum' });
check(validateHttpHeaders({ 'mcp-method': valid.method, 'mcp-protocol-version': VERSION, 'mcp-name': 'sum' }, valid), true, 'HTTP headers agree with JSON body');
check(validateHttpHeaders({ 'mcp-method': 'tools/list', 'mcp-protocol-version': VERSION }, valid), false, 'method mismatch fails header check');
check(validateHttpHeaders({ 'mcp-method': valid.method, 'mcp-protocol-version': '2025-11-25' }, valid), false, 'version mismatch fails header check');
const named = request('resources/read', { uri: 'file:///note' });
check(validateHttpHeaders({ 'mcp-method': named.method, 'mcp-protocol-version': VERSION, 'mcp-name': 'file:///note' }, named), true, 'Mcp-Name mirrors a URI method parameter');
check(validateHttpHeaders({ 'mcp-method': named.method, 'mcp-protocol-version': VERSION, 'mcp-name': 'file:///other' }, named), false, 'Mcp-Name mismatch is rejected');

const lines = [];
const decoder = createLineDecoder((line) => lines.push(line));
const utf8 = Buffer.from('{"text":"雪"}\r\n{"n":2}\n');
decoder.push(utf8.subarray(0, 12)); decoder.push(utf8.subarray(12)); decoder.end();
check(lines, ['{"text":"雪"}', '{"n":2}'], 'stdio decoder joins split UTF-8 and CRLF frames');
assert.throws(() => { const d = createLineDecoder(() => {}, 3); d.push(Buffer.from('long')); }, RangeError); checks += 1;
assert.throws(() => { const d = createLineDecoder(() => {}); d.push(Buffer.from('{')); d.end(); }, SyntaxError); checks += 1;

const publicEntry = cacheEntry(list.result, 100);
check(publicEntry.expiresAt, 1100, 'TTL becomes an absolute expiry');
check(publicEntry.scope, 'public', 'cache entry keeps server scope');
assert.throws(() => cacheEntry({ ttlMs: -1, cacheScope: 'public' }), TypeError); checks += 1;
check(cacheKey('server-a', 'tools/list', {}, 'public', 'u1'), cacheKey('server-a', 'tools/list', {}, 'public', 'u2'), 'public cache key omits user');
check(cacheKey('server-a', 'tools/list', {}, 'private', 'u1') === cacheKey('server-a', 'tools/list', {}, 'private', 'u2'), false, 'private cache keys isolate principals');
check(cacheKey('server-a', 'tools/list', {}, 'public') === cacheKey('server-b', 'tools/list', {}, 'public'), false, 'cache keys isolate server identity');
assert.throws(() => cacheEntry({ ttlMs: 1, cacheScope: 'user' }), TypeError); checks += 1;
assert.throws(() => cacheKey('server-a', 'tools/list', {}, 'private'), TypeError); checks += 1;

let executed = 0;
const denied = await invokeWithApproval('delete', { id: 1 }, async () => false, async () => { executed += 1; });
check(denied.reason, 'denied', 'approval denial is returned to caller');
check(executed, 0, 'denied tool has no side effect');
const allowed = await invokeWithApproval('read', {}, async () => true, async () => { executed += 1; return 'ok'; });
check(allowed.value, 'ok', 'approved tool executes');
check(executed, 1, 'approved tool executes exactly once');

const candidates = dedupeCandidates([{ id: 'a', score: 1 }, { id: 'a', score: 4 }, { id: 'b', score: 2 }, { id: 'bad', score: NaN }]);
check(candidates.map((x) => x.id), ['a', 'b'], 'retrieval drops invalids, keeps best duplicate, and ranks');
check(dedupeCandidates([]), [], 'empty retrieval stays empty');

let modelTurn = 0;
const loopResult = await runAgentLoop({ model: async () => (++modelTurn === 1 ? { toolCalls: [{ id: 'c1', name: 'sum', arguments: { a: 1, b: 2 } }] } : { content: 'done' }), tools: { sum: ({ a, b }) => a + b }, maxTurns: 2 });
check(loopResult.reason, 'final', 'agent loop stops when the model returns no tool calls');
check(loopResult.turns, 2, 'tool result triggers a second model turn');
check(loopResult.transcript.find((message) => message.role === 'tool').output, 3, 'tool output enters the next-turn transcript');
const loopCapped = await runAgentLoop({ model: async () => ({ toolCalls: [{ id: 'again', name: 'sum', arguments: { a: 1, b: 1 } }] }), tools: { sum: ({ a, b }) => a + b }, maxTurns: 1 });
check(loopCapped.reason, 'turn_budget', 'agent loop reports exhausted turn budget');

const budget = consumeBudget({ turns: 0, calls: 0, tokens: 0 }, { turns: 1, calls: 1, tokens: 3 }, { turns: 1, calls: 1, tokens: 3 });
check(budget.reason, null, 'usage equal to budgets remains allowed');
check(consumeBudget(budget.next, { tokens: 1 }, { turns: 1, calls: 1, tokens: 3 }).reason, 'token_budget', 'token budget has an independent stop reason');
check(consumeBudget({ turns: 1, calls: 0, tokens: 0 }, { turns: 1 }, { turns: 1, calls: 2, tokens: 5 }).reason, 'turn_budget', 'turn budget is checked separately');
check(consumeBudget({ turns: 0, calls: 1, tokens: 0 }, { calls: 2 }, { turns: 5, calls: 2, tokens: 5 }).reason, 'tool_budget', 'tool-call budget is checked separately');
assert.throws(() => consumeBudget({ turns: -1, calls: 0, tokens: 0 }, {}, { turns: 5, calls: 5, tokens: 5 }), RangeError); checks += 1;

const saved = saveSessionSnapshot({ sessionId: 's1', revision: 2, messages: [{ role: 'user', content: 'hi' }] });
check(restoreSessionSnapshot(saved).messages.length, 1, 'valid session snapshot restores message history');
check(restoreSessionSnapshot(saved).revision, 2, 'snapshot preserves the supplied revision value');
assert.throws(() => saveSessionSnapshot({ sessionId: 's1', revision: -1, messages: [] }), TypeError); checks += 1;
assert.throws(() => restoreSessionSnapshot('{'), SyntaxError); checks += 1;
assert.throws(() => restoreSessionSnapshot(JSON.stringify({ version: 2, sessionId: 's1', revision: 1, messages: [] })), TypeError); checks += 1;
assert.throws(() => restoreSessionSnapshot('null'), TypeError); checks += 1;
check(JSON.parse(saveSessionSnapshot({ version: 9, sessionId: 's1', revision: 1, messages: [] })).version, 1, 'snapshot writer cannot be overridden to a different format version');

let inFlight = 0; let peak = 0;
const fanout = await mapWithLimit([1, 2, 3, 4], 2, async (value) => { inFlight += 1; peak = Math.max(peak, inFlight); await new Promise((resolve) => setTimeout(resolve, 2)); inFlight -= 1; if (value === 3) throw new Error('worker failed'); return value * 10; });
check(peak, 2, 'fan-out never exceeds configured concurrency');
check(fanout[0], { ok: true, value: 10 }, 'fan-out stores success at input index');
check(fanout[2], { ok: false, error: 'worker failed' }, 'worker failure is isolated in its result slot');
await assert.rejects(() => mapWithLimit([], 0, async () => 1), RangeError); checks += 1;

const plugins = new Map();
registerPlugin(plugins, { id: 'issue-reader', permissions: ['issues:read'] }, async () => []);
check(plugins.has('issue-reader'), true, 'valid plugin is registered');
check(plugins.get('issue-reader').manifest.permissions, ['issues:read'], 'plugin manifest declares its requested scope');
assert.throws(() => registerPlugin(plugins, { id: 'issue-reader', permissions: [] }, async () => []), /already registered/); checks += 1;
assert.throws(() => registerPlugin(plugins, { id: '../unsafe', permissions: [] }, async () => []), TypeError); checks += 1;

await test('RPC client correlates concurrent replies even when they arrive out of order', async () => {
  const sent = [];
  const client = new RpcClient((message) => sent.push(message));
  const first = client.request('tools/list');
  const second = client.request('server/discover');
  assert.equal(client.pendingCount, 2);
  assert.equal(sent[0].params._meta[META_CAPS] !== undefined, true);
  assert.equal(client.accept({ jsonrpc: '2.0', id: 2, result: { resultType: 'complete', supportedVersions: [VERSION] } }), true);
  assert.deepEqual(await second, { resultType: 'complete', supportedVersions: [VERSION] });
  assert.equal(client.accept({ jsonrpc: '2.0', id: 1, result: { resultType: 'complete', tools: [] } }), true);
  assert.deepEqual(await first, { resultType: 'complete', tools: [] });
  assert.equal(client.pendingCount, 0);
});

await test('RPC client timeout removes a pending id and cannot poison a later response', async () => {
  const sent = [];
  const client = new RpcClient((message) => sent.push(message));
  await assert.rejects(client.request('tools/list', {}, { timeoutMs: 5 }), { name: 'TimeoutError' });
  assert.equal(client.pendingCount, 0);
  assert.equal(client.accept({ jsonrpc: '2.0', id: sent[0].id, result: {} }), false);
});

await test('RPC client close rejects every outstanding request and future sends', async () => {
  const client = new RpcClient(() => {});
  const a = client.request('tools/list');
  const b = client.request('server/discover');
  client.close(new Error('transport closed'));
  await assert.rejects(a, /transport closed/);
  await assert.rejects(b, /transport closed/);
  assert.equal(client.pendingCount, 0);
  await assert.rejects(client.request('tools/list'), /closed/);
});

await test('RPC client maps remote JSON-RPC errors to rejected calls with protocol details', async () => {
  const client = new RpcClient((message) => queueMicrotask(() => client.accept({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not found', data: { method: 'x' } } })));
  await assert.rejects(client.request('missing'), (error) => error.code === -32601 && error.data.method === 'x');
});

await test('RPC client surfaces a synchronous transport write failure', async () => {
  const client = new RpcClient(() => { throw new Error('pipe closed'); });
  await assert.rejects(client.request('tools/list'), /pipe closed/);
  assert.equal(client.pendingCount, 0);
});

await test('RPC client refuses zero, negative, and non-finite deadlines before sending', async () => {
  let sends = 0;
  const client = new RpcClient(() => { sends += 1; });
  for (const timeoutMs of [0, -1, NaN, Infinity]) await assert.rejects(client.request('tools/list', {}, { timeoutMs }), RangeError);
  assert.equal(sends, 0);
  assert.equal(client.pendingCount, 0);
});

await test('RPC client rejects response containing both result and error', async () => {
  const client = new RpcClient(() => {});
  const pending = client.request('tools/list');
  assert.equal(client.accept({ jsonrpc: '2.0', id: 1, result: { resultType: 'complete' }, error: { code: -1, message: 'bad' } }), true);
  await assert.rejects(pending, /exactly one result or error/);
});

await test('RPC client rejects malformed error object and clears its pending entry', async () => {
  const client = new RpcClient(() => {});
  const pending = client.request('tools/list');
  client.accept({ jsonrpc: '2.0', id: 1, error: null });
  await assert.rejects(pending, /Malformed JSON-RPC error object/);
  assert.equal(client.pendingCount, 0);
});

await test('RPC client rejects unsupported result types instead of resolving them', async () => {
  const client = new RpcClient(() => {});
  const pending = client.request('tools/list');
  client.accept({ jsonrpc: '2.0', id: 1, result: { resultType: 'input_required' } });
  await assert.rejects(pending, /resultType complete only/);
});

const completedBeforeAbort = new AbortController();
check(await raceWithAbort(Promise.resolve('finished'), completedBeforeAbort.signal), 'finished', 'completed work wins the abort race');
const abortController = new AbortController();
const cancelledWork = raceWithAbort(new Promise((resolve) => setTimeout(() => resolve('late'), 20)), abortController.signal);
abortController.abort(new Error('user cancelled'));
await assert.rejects(cancelledWork, /user cancelled/); checks += 1;
const preAborted = new AbortController(); preAborted.abort(new Error('already stopped'));
await assert.rejects(() => raceWithAbort(Promise.resolve('never used'), preAborted.signal), /already stopped/); checks += 1;

// Exercise the HTTP binding against a real loopback server and real fetch requests.
const httpServer = createMcpHttpServer();
httpServer.listen(0, '127.0.0.1'); await once(httpServer, 'listening');
const address = httpServer.address();
const endpoint = `http://127.0.0.1:${address.port}/mcp`;
const httpBody = request('server/discover');
const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-method': httpBody.method, 'mcp-protocol-version': VERSION };
const httpOk = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(httpBody) });
check(httpOk.status, 200, 'valid HTTP MCP request is accepted');
check((await httpOk.json()).result.supportedVersions, [VERSION], 'HTTP round trip returns protocol payload');
check(httpOk.headers.get('mcp-session-id'), null, 'stateless response has no session header');
await test('native HTTP client sends required metadata and the server handles a tool call', async () => {
  const result = await callMcpHttp(endpoint, 'tools/call', { name: 'sum', arguments: { a: 8, b: 9 } }, 71);
  assert.equal(result.structuredContent.value, 17);
  assert.equal(result.resultType, 'complete');
});
await test('native HTTP client mirrors method, name, version, content type, and Accept', async () => {
  let observed;
  await callMcpHttp(endpoint, 'tools/call', { name: 'sum', arguments: { a: 1, b: 1 } }, 72, { fetchImpl: async (url, init) => {
    observed = { url, init, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 72, result: { resultType: 'complete' } }), { status: 200, headers: { 'content-type': 'application/json' } });
  } });
  assert.equal(observed.init.headers['mcp-method'], 'tools/call');
  assert.equal(observed.init.headers['mcp-name'], 'sum');
  assert.equal(observed.init.headers['mcp-protocol-version'], VERSION);
  assert.equal(observed.init.headers.accept, 'application/json, text/event-stream');
  assert.equal(observed.body.params._meta[META_CAPS] !== undefined, true);
});
await test('native HTTP client rejects mismatched response ids and unexpected response media types', async () => {
  const mismatch = () => callMcpHttp(endpoint, 'server/discover', {}, 73, { fetchImpl: async () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 99, result: {} }), { headers: { 'content-type': 'application/json' } }) });
  await assert.rejects(mismatch, /id or JSON-RPC version mismatch/);
  await assert.rejects(() => callMcpHttp(endpoint, 'server/discover', {}, 73, { fetchImpl: async () => new Response('{}', { headers: { 'content-type': 'text/plain' } }) }), /Content-Type/);
});
const httpBad = await fetch(endpoint, { method: 'POST', headers: { ...headers, 'mcp-method': 'tools/list' }, body: JSON.stringify(httpBody) });
check(httpBad.status, 400, 'HTTP header/body mismatch is a client error');
check((await httpBad.json()).error.code, MCP_ERRORS.headerMismatch, 'HTTP mismatch uses reserved protocol error');
const wrongType = await fetch(endpoint, { method: 'POST', headers: { ...headers, 'content-type': 'text/plain' }, body: JSON.stringify(httpBody) });
check(wrongType.status, 415, 'non-JSON HTTP content type is rejected');
const wrongMethod = await fetch(endpoint, { method: 'GET' });
check(wrongMethod.status, 405, 'HTTP transport only accepts POST');
const badAccept = await fetch(endpoint, { method: 'POST', headers: { ...headers, accept: 'application/json' }, body: JSON.stringify(httpBody) });
check(badAccept.status, 406, 'HTTP requires a client Accept header for JSON and event stream');
await test('HTTP Accept media type matching is case-insensitive', async () => {
  const response = await fetch(endpoint, { method: 'POST', headers: { ...headers, accept: 'Application/JSON, Text/Event-Stream' }, body: JSON.stringify(httpBody) });
  assert.equal(response.status, 200);
});
const badOrigin = await fetch(endpoint, { method: 'POST', headers: { ...headers, origin: 'not a URL' }, body: JSON.stringify(httpBody) });
check(badOrigin.status, 403, 'malformed Origin is rejected without crashing the server');
const badVersionBody = { ...httpBody, params: { ...httpBody.params, _meta: { ...httpBody.params._meta, [META_CAPS]: {}, 'io.modelcontextprotocol/protocolVersion': '1900-01-01' } } };
const badVersion = await fetch(endpoint, { method: 'POST', headers: { ...headers, 'mcp-protocol-version': '1900-01-01' }, body: JSON.stringify(badVersionBody) });
check(badVersion.status, 400, 'unsupported protocol version maps to HTTP 400');
check((await badVersion.json()).error.data.requested, '1900-01-01', 'HTTP version error includes the requested version');
const badJson = await fetch(endpoint, { method: 'POST', headers, body: '{' });
check(badJson.status, 400, 'malformed JSON receives HTTP 400');
await test('HTTP transport rejects valid JSON null with an invalid-request error, not parse-error id null', async () => {
  const response = await fetch(endpoint, { method: 'POST', headers, body: 'null' });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, -32600);
});
await test('HTTP transport rejects client notifications because this binding is request-only', async () => {
  const notification = { jsonrpc: '2.0', method: 'notifications/cancelled', params: {} };
  const response = await fetch(endpoint, { method: 'POST', headers: { ...headers, 'mcp-method': notification.method, 'mcp-protocol-version': VERSION }, body: JSON.stringify(notification) });
  assert.equal(response.status, 400);
  assert.equal(await response.text(), '');
});
await test('HTTP unknown RPC methods use 404 while retaining the JSON-RPC method error', async () => {
  const unknown = request('not/a-method');
  const response = await fetch(endpoint, { method: 'POST', headers: { ...headers, 'mcp-method': unknown.method }, body: JSON.stringify(unknown) });
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, -32601);
});
await test('HTTP legal JSON null body receives invalid-request response without an id field', async () => {
  const response = await fetch(endpoint, { method: 'POST', headers, body: 'null' });
  const payload = await response.json();
  assert.equal(Object.hasOwn(payload, 'id'), false);
});
await test('HTTP JSON required metadata failure is rejected before header comparison', async () => {
  const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 33, method: 'server/discover', params: {} }) });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, -32602);
});
await new Promise((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()));

// Exercise newline framing through a real child process, including two requests.
const child = spawn(process.execPath, ['--input-type=module', '-e', `import { runStdio } from ${JSON.stringify(new URL('./mcp-mini.mjs', import.meta.url).href)}; runStdio();`], { stdio: ['pipe', 'pipe', 'pipe'] });
let stdout = '';
child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
child.stdin.end(`${JSON.stringify(request('server/discover', {}, {}, 21))}\n${JSON.stringify(request('tools/list', {}, {}, 22))}\n${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/cancelled', params: {} })}\n`);
await once(child, 'exit');
const frames = stdout.trim().split('\n').map(JSON.parse);
check(frames.length, 2, 'stdio child emits one response per request');
check(frames.map((frame) => frame.id), [21, 22], 'stdio child correlates responses by request id');
check(frames[0].result.supportedVersions, [VERSION], 'stdio child handles discovery');
check(frames[1].result.cacheScope, 'public', 'stdio child handles list request');
check(child.stderr.read()?.toString() ?? '', '', 'stdio child keeps diagnostics off stderr on success');

console.log(`通过：${checks} 项快捷行为检查（另有独立命名 test 场景；HTTP 与 stdio 均使用真实本地端点）`);
test('agent transcript role cannot be promoted by fields in model output', async () => {
  const result = await runAgentLoop({ model: async () => ({ role: 'system', content: 'untrusted role' }), tools: new Map() });
  assert.equal(result.transcript[0].role, 'assistant');
});
test('fan-out isolates a worker that throws null rather than Error', async () => {
  const result = await mapWithLimit([1, 2], 2, async value => { if (value === 1) throw null; return value; });
  assert.deepEqual(result, [{ ok: false, error: 'null' }, { ok: true, value: 2 }]);
});
test('fan-out retains string rejection details without losing sibling results', async () => {
  const result = await mapWithLimit([1, 2], 2, async value => { if (value === 2) throw 'worker unavailable'; return value; });
  assert.deepEqual(result, [{ ok: true, value: 1 }, { ok: false, error: 'worker unavailable' }]);
});
