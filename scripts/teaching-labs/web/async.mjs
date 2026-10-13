// W009 — XHR adapter keeps callback-era progress events behind a Promise API.
// The injected factory is a test seam, not evidence of browser networking.
export function xhrRequest(url, { method = 'GET', body = null, signal, xhrFactory = () => new XMLHttpRequest() } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = xhrFactory();
    let settled = false;
    const finish = (callback, value) => { if (settled) return; settled = true; cleanup(); callback(value); };
    const cleanup = () => signal?.removeEventListener('abort', abort);
    const abort = () => { xhr.abort(); finish(reject, new DOMException('Aborted', 'AbortError')); };
    xhr.open(method, url, true);
    xhr.onload = () => finish(resolve, { status: xhr.status, text: xhr.responseText, xhr });
    xhr.onerror = () => finish(reject, new TypeError('Network error'));
    xhr.onabort = () => finish(reject, new DOMException('Aborted', 'AbortError'));
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    xhr.send(body);
  });
}

// W010 — Fetch resolves on HTTP 404/500; this helper makes the application
// contract explicit by rejecting non-2xx before parsing JSON.
export async function fetchJson(url, { fetchImpl = fetch, ...init } = {}) {
  const response = await fetchImpl(url, init);
  if (!response.ok) { const error = new Error(`HTTP ${response.status}`); error.status = response.status; throw error; }
  return response.json();
}

// W011 — Abort saves work; the sequence token still guards against adapters
// that ignore cancellation or responses already queued for delivery.
export function createLatestSearch(request) {
  let generation = 0; let active;
  return async query => {
    active?.abort(); active = new AbortController(); const ticket = ++generation;
    const value = await request(query, { signal: active.signal });
    return ticket === generation ? { current: true, value } : { current: false, value: undefined };
  };
}

// W012 — Only transient failures are retried; the caller injects sleep/random
// so tests can assert delays without waiting or sampling nondeterministically.
export async function retry(task, { retries = 2, baseMs = 100, shouldRetry = () => true, wait = ms => new Promise(r => setTimeout(r, ms)), random = Math.random, signal } = {}) {
  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    try { return await task(attempt); } catch (error) {
      if (attempt >= retries || !shouldRetry(error)) throw error;
      await wait(Math.round(baseMs * 2 ** attempt * (0.5 + random())));
    }
  }
}

// W013 — Workers claim indexes synchronously before awaiting, so no two workers
// can run one job and output order remains the input order.
export async function mapLimit(items, limit, mapper) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer');
  const output = new Array(items.length); let next = 0; let failed = false;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (!failed) {
      const index = next++; if (index >= items.length) return;
      try { output[index] = await mapper(items[index], index); }
      catch (error) { failed = true; throw error; }
    }
  }));
  return output;
}

// W014 — A timeout must settle once and abort the underlying request, not merely
// race its Promise while leaving the network and response body running.
export async function withTimeout(task, ms, { timers = globalThis, parentSignal } = {}) {
  const controller = new AbortController();
  const relay = () => controller.abort(parentSignal.reason);
  if (parentSignal?.aborted) relay(); else parentSignal?.addEventListener('abort', relay, { once: true });
  let timer;
  try {
    return await Promise.race([
      task(controller.signal),
      new Promise((_, reject) => { timer = timers.setTimeout(() => { controller.abort(); reject(new Error('Timeout')); }, ms); }),
    ]);
  } finally { timers.clearTimeout(timer); parentSignal?.removeEventListener('abort', relay); }
}

// W015 — TextDecoder's streaming mode retains a split UTF-8 code point between
// chunks; newline framing happens after decoding, not per network chunk.
export async function* readLines(stream) {
  const decoder = new TextDecoder('utf-8', { fatal: true }); let pending = '';
  for await (const chunk of stream) {
    pending += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = pending.indexOf('\n')) >= 0) { let line = pending.slice(0, newline); if (line.endsWith('\r')) line = line.slice(0, -1); yield line; pending = pending.slice(newline + 1); }
  }
  pending += decoder.decode();
  if (pending) yield pending.endsWith('\r') ? pending.slice(0, -1) : pending;
}

// W016 — Upload progress is a measurement adapter: loaded/total are bytes, and
// total may be zero/unknown, so percentage is not always meaningful.
export function watchUpload(xhr, onProgress) {
  const handler = event => onProgress({ loaded: event.loaded, total: event.lengthComputable ? event.total : null, percent: event.lengthComputable && event.total ? event.loaded / event.total * 100 : null });
  xhr.upload.addEventListener('progress', handler);
  return () => xhr.upload.removeEventListener('progress', handler);
}
