// Explicit resource leases make release idempotent and prevent double-destroy during device-loss cleanup.
export class ResourcePool {
  #entries = new Map();
  constructor({ budgetBytes }) { if (!Number.isSafeInteger(budgetBytes) || budgetBytes < 0) throw new RangeError('budgetBytes must be non-negative'); this.budgetBytes = budgetBytes; }
  acquire(key, bytes, destroy) {
    if (this.#entries.has(key)) throw new Error(`resource already leased: ${key}`);
    if (!Number.isSafeInteger(bytes) || bytes < 0 || typeof destroy !== 'function') throw new TypeError('invalid resource lease');
    if (this.bytes + bytes > this.budgetBytes) throw new Error('resource budget exceeded');
    const entry = { bytes, destroy, released: false }; this.#entries.set(key, entry);
    return () => {
      if (entry.released) return false;
      entry.released = true; this.#entries.delete(key); entry.destroy(); return true;
    };
  }
  get bytes() { let total = 0; for (const entry of this.#entries.values()) total += entry.bytes; return total; }
  disposeAll() {
    const errors = [];
    for (const [key, entry] of [...this.#entries]) {
      this.#entries.delete(key); // Release accounting before callbacks so failure cannot strand budget.
      if (!entry.released) { entry.released = true; try { entry.destroy(); } catch (error) { errors.push(error); } }
    }
    if (errors.length) throw new AggregateError(errors, 'one or more resources failed to destroy');
  }
}
