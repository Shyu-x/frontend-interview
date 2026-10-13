// W017 — Money stays in integer minor units; quantity and negative prices are
// validated before applying a capped fixed discount.
export function cartTotal(lines, discountCents = 0) {
  if (!Number.isSafeInteger(discountCents) || discountCents < 0) throw new RangeError('invalid discount');
  let subtotal = 0;
  for (const { unitCents, quantity } of lines) {
    if (!Number.isSafeInteger(unitCents) || unitCents < 0 || !Number.isSafeInteger(quantity) || quantity < 0) throw new RangeError('invalid cart line');
    subtotal += unitCents * quantity;
    if (!Number.isSafeInteger(subtotal)) throw new RangeError('subtotal overflow');
  }
  return Math.max(0, subtotal - discountCents);
}

// W018 — Optimistic writes return a rollback closure tied to their revision;
// an old failure cannot overwrite a newer successful toggle.
export function optimisticToggle(state, id) {
  const previous = Boolean(state[id]); const revision = (state.__revision ?? 0) + 1;
  const next = { ...state, [id]: !previous, __revision: revision };
  return { state: next, rollback(current) { return current.__revision === revision ? { ...current, [id]: previous, __revision: revision + 1 } : current; } };
}

// W019 — One refresh promise is shared by concurrent 401 handlers. Clearing in
// finally prevents a rejected refresh from poisoning every future login.
export function createTokenRefresher(refresh) {
  let pending;
  return () => {
    if (!pending) pending = Promise.resolve().then(refresh).finally(() => { pending = undefined; });
    return pending;
  };
}

// W020 — A page request carries its query generation; stale page results are
// identified for the caller instead of being silently appended to new results.
export function createPager(loadPage) {
  let generation = 0;
  return {
    reset(query) { generation++; return { generation, query, page: 0 }; },
    async next(state) { const page = state.page + 1; const rows = await loadPage(state.query, page); return state.generation === generation ? { ...state, page, rows, stale: false } : { ...state, stale: true }; },
  };
}

// W021 — Autosave uses optimistic concurrency: a 409 leaves the local draft
// intact and returns the server version for an explicit merge decision.
export async function saveDraft(draft, { version, put }) {
  try { const saved = await put({ draft, ifMatch: version }); return { status: 'saved', draft: saved.draft, version: saved.version }; }
  catch (error) { if (error.status === 409) return { status: 'conflict', local: draft, remote: error.remote, version: error.version }; throw error; }
}

// W022 — Checkout transitions are explicit; payment success can only be applied
// from submitting, preventing duplicate click or late webhook state jumps.
const checkoutTransitions = { cart: ['submitting'], submitting: ['paid', 'failed'], failed: ['submitting'], paid: [] };
export function transitionCheckout(state, event) {
  const next = { submit: 'submitting', success: 'paid', failure: 'failed' }[event];
  if (!next || !checkoutTransitions[state]?.includes(next)) throw new Error(`Invalid checkout transition: ${state}/${event}`);
  return next;
}

// W023 — Merge independent fields by per-field edit time. Equal timestamps use
// server as the deterministic tie-breaker; conflicts are returned for UI review.
export function mergeDraft(base, local, remote) {
  const result = {}; const conflicts = [];
  for (const key of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
    const l = local[key]; const r = remote[key];
    if (!l || !r) { result[key] = l ?? r ?? base[key]; continue; }
    if (l.value === r.value) { result[key] = l; continue; }
    if (l.editedAt === r.editedAt) conflicts.push(key);
    result[key] = l.editedAt > r.editedAt ? l : r;
  }
  return { fields: result, conflicts };
}

// W024 — URL state is shareable, so parsing validates user-controlled query
// values and serialization sorts keys for stable links and cache keys.
export function parseFilters(search) {
  const params = new URLSearchParams(search); const page = Number(params.get('page') ?? 1);
  if (!Number.isSafeInteger(page) || page < 1) throw new RangeError('page must be a positive integer');
  return { page, sort: ['newest', 'price'].includes(params.get('sort')) ? params.get('sort') : 'newest', tags: [...new Set(params.getAll('tag').filter(Boolean))].sort() };
}
export function serializeFilters(filters) {
  const params = new URLSearchParams(); params.set('page', String(filters.page)); params.set('sort', filters.sort);
  for (const tag of [...new Set(filters.tags)].sort()) params.append('tag', tag);
  return `?${params.toString()}`;
}
