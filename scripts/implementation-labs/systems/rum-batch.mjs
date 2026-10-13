// Keep a bounded RUM queue; flush as a batch and retain the batch only when transport fails.
export class RumBatch {
  #queue = []; #inflight;
  constructor({ maxItems = 50, maxBytes = 48 * 1024, send }) {
    if (!Number.isInteger(maxItems) || maxItems < 1 || !Number.isFinite(maxBytes) || maxBytes < 2 || typeof send !== 'function') throw new TypeError('invalid batch configuration');
    this.maxItems = maxItems; this.maxBytes = maxBytes; this.send = send;
  }
  add(metric) {
    // Snapshot mutable caller data now so later mutation cannot evade the byte budget.
    const encoded = JSON.stringify(metric);
    if (Buffer.byteLength(encoded) > this.maxBytes) return false;
    const snapshot = JSON.parse(encoded);
    if (this.#queue.length >= this.maxItems || Buffer.byteLength(JSON.stringify([...this.#queue, snapshot])) > this.maxBytes) return false;
    this.#queue.push(snapshot); return true;
  }
  async flush() {
    // Share one send operation among simultaneous callers; duplicate POSTs can otherwise double-count telemetry.
    if (this.#inflight) return this.#inflight;
    if (!this.#queue.length) return true;
    const batch = this.#queue.slice();
    this.#inflight = Promise.resolve().then(() => this.send(JSON.stringify(batch)))
      .then((accepted) => {
        if (accepted) this.#queue.splice(0, batch.length); // Remove only the sent prefix; later adds remain queued.
        return Boolean(accepted);
      })
      .catch(() => false)
      .finally(() => { this.#inflight = undefined; });
    return this.#inflight;
  }
  get size() { return this.#queue.length; }
}
