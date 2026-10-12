/** Deterministic frame scheduler for model tests; each frame runs at its supplied timestamp. */
export class ManualClock {
  #time = 0;
  #nextId = 1;
  #callbacks = new Map();
  #cancelled = 0;

  now = () => this.#time;
  request = (callback) => {
    const id = this.#nextId++;
    this.#callbacks.set(id, callback);
    return id;
  };
  cancel = (id) => {
    if (this.#callbacks.delete(id)) this.#cancelled++;
  };

  get pendingFrames() { return this.#callbacks.size; }
  get cancelledFrames() { return this.#cancelled; }

  frame(timestamp) {
    if (!Number.isFinite(timestamp)) throw new TypeError('timestamp must be finite');
    this.#time = timestamp;
    const callbacks = [...this.#callbacks.values()];
    this.#callbacks.clear();
    for (const callback of callbacks) callback(timestamp);
  }
}
