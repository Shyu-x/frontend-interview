// W033 — Map insertion order encodes recency: get moves a hit to the tail, and
// eviction removes the head in O(1) average time.
export class LruCache {
  #map = new Map();
  constructor(capacity) { if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('capacity must be positive'); this.capacity = capacity; }
  get(key) { if (!this.#map.has(key)) return undefined; const value = this.#map.get(key); this.#map.delete(key); this.#map.set(key, value); return value; }
  set(key, value) { this.#map.delete(key); this.#map.set(key, value); if (this.#map.size > this.capacity) this.#map.delete(this.#map.keys().next().value); }
  get size() { return this.#map.size; }
}

// W034 — TTL is checked against an injected monotonic clock at read time; stale
// data is deleted lazily, so a timer is not required for every entry.
export class TtlCache {
  #entries = new Map();
  constructor(now = () => performance.now()) { this.now = now; }
  set(key, value, ttlMs) { if (!(ttlMs >= 0)) throw new RangeError('ttl must be non-negative'); this.#entries.set(key, { value, expiresAt: this.now() + ttlMs }); }
  get(key) { const item = this.#entries.get(key); if (!item) return undefined; if (this.now() >= item.expiresAt) { this.#entries.delete(key); return undefined; } return item.value; }
}

// W035 — Serve stale immediately while a single refresh runs; refresh failure
// keeps stale data, while a cold miss surfaces the failure to its caller.
export function createStaleWhileRevalidate({ now = Date.now } = {}) {
  const entries = new Map();
  return async function read(key, loader, maxAge) {
    const entry = entries.get(key); const fresh = entry && now() < entry.expiresAt;
    if (fresh) return { value: entry.value, stale: false };
    if (entry) {
      if (!entry.pending) entry.pending = Promise.resolve().then(loader).then(value => { entries.set(key, { value, expiresAt: now() + maxAge }); return value; }).catch(() => entry.value).finally(() => { entry.pending = undefined; });
      return { value: entry.value, stale: true, refresh: entry.pending };
    }
    const value = await loader(); entries.set(key, { value, expiresAt: now() + maxAge }); return { value, stale: false };
  };
}

// W036 — Canonical JSON cache keys sort object keys recursively and reject
// cycles instead of accidentally sharing results for different inputs.
export function stableCacheKey(value) {
  const seen = new WeakSet();
  const normalize = item => {
    if (item === null || typeof item !== 'object') return item;
    if (seen.has(item)) throw new TypeError('cyclic cache input');
    seen.add(item);
    const result = Array.isArray(item) ? item.map(normalize) : Object.fromEntries(Object.keys(item).sort().map(key => [key, normalize(item[key])]));
    seen.delete(item); return result;
  };
  return JSON.stringify(normalize(value));
}

// W037 — This tokenizer recognizes a deliberately small arithmetic language;
// consuming every character lets the parser reject hidden trailing garbage.
export function tokenize(source) {
  const tokens = []; let index = 0;
  while (index < source.length) {
    if (/\s/.test(source[index])) { index++; continue; }
    const start = index; const number = /^(?:\d+\.?\d*|\.\d+)/.exec(source.slice(index));
    if (number) { tokens.push({ type: 'number', value: Number(number[0]), start }); index += number[0].length; continue; }
    if ('+-*/()'.includes(source[index])) { tokens.push({ type: source[index], value: source[index], start }); index++; continue; }
    throw new SyntaxError(`Unexpected character at ${index}`);
  }
  tokens.push({ type: 'eof', start: index }); return tokens;
}

// W038 — Pratt binding powers make precedence local: multiplication binds more
// tightly than addition, while recursive right parsing handles parentheses.
export function evaluateExpression(source) {
  const tokens = tokenize(source); let cursor = 0;
  const bp = { '+': 10, '-': 10, '*': 20, '/': 20 };
  function expression(min = 0) {
    let token = tokens[cursor++]; let left;
    if (token.type === 'number') left = token.value;
    else if (token.type === '-') left = -expression(30);
    else if (token.type === '(') { left = expression(); if (tokens[cursor++].type !== ')') throw new SyntaxError('Expected )'); }
    else throw new SyntaxError(`Expected number at ${token.start}`);
    while ((bp[tokens[cursor].type] ?? -1) >= min) {
      const op = tokens[cursor++].type; const right = expression(bp[op] + 1);
      left = op === '+' ? left + right : op === '-' ? left - right : op === '*' ? left * right : left / right;
    }
    return left;
  }
  const result = expression(); if (tokens[cursor].type !== 'eof') throw new SyntaxError(`Unexpected token at ${tokens[cursor].start}`); return result;
}

// W039 — Pointer coordinates are converted from CSS pixels into canvas backing
// pixels before testing; DPR scaling otherwise makes clicks miss on HiDPI.
export function hitTestRect(event, canvas, rect) {
  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * canvas.width / bounds.width;
  const y = (event.clientY - bounds.top) * canvas.height / bounds.height;
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

// W040 — A frame budget is an admission decision in milliseconds; it does not
// predict GPU completion, so the caller must still observe real frame timing.
export function takeFrameJobs(jobs, budgetMs) {
  if (!(budgetMs >= 0)) throw new RangeError('budget must be non-negative');
  const selected = []; let used = 0;
  while (jobs.length && used + jobs[0].costMs <= budgetMs) { const job = jobs.shift(); selected.push(job); used += job.costMs; }
  return { selected, remaining: jobs, usedMs: used };
}
