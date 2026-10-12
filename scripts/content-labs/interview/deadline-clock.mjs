/** A deadline-based countdown model. Time values are milliseconds. */
export class DeadlineClock {
  #remainingMs;
  #deadline = null;
  #now;
  #lastNow = -Infinity;
  #state = 'idle';

  constructor({ durationMs, now }) {
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      throw new RangeError('durationMs must be a finite non-negative number');
    }
    if (typeof now !== 'function') throw new TypeError('now must be a function');
    this.#remainingMs = durationMs;
    this.#now = now;
  }

  get state() { return this.#state; }

  start() {
    if (this.#state !== 'idle') return this;
    if (this.#remainingMs === 0) {
      this.#state = 'finished';
      this.#now = null;
    }
    else {
      const deadline = this.#readNow() + this.#remainingMs;
      if (!Number.isFinite(deadline)) throw new RangeError('deadline exceeds finite clock range');
      this.#deadline = deadline;
      this.#state = 'running';
    }
    return this;
  }

  remainingMs() {
    if (this.#state === 'running') {
      this.#remainingMs = Math.max(0, this.#deadline - this.#readNow());
      if (this.#remainingMs === 0) {
        this.#state = 'finished';
        this.#deadline = null;
        this.#now = null;
      }
    }
    return this.#remainingMs;
  }

  snapshot() {
    const remainingMs = this.remainingMs();
    return { state: this.#state, remainingMs, display: formatClock(remainingMs) };
  }

  pause() {
    if (this.#state !== 'running') return this;
    this.remainingMs();
    if (this.#state === 'running') this.#state = 'paused';
    return this;
  }

  resume() {
    if (this.#state !== 'paused') return this;
    if (this.#remainingMs === 0) {
      this.#state = 'finished';
      this.#now = null;
    }
    else {
      const deadline = this.#readNow() + this.#remainingMs;
      if (!Number.isFinite(deadline)) throw new RangeError('deadline exceeds finite clock range');
      this.#deadline = deadline;
      this.#state = 'running';
    }
    return this;
  }

  cancel() {
    if (this.#state === 'running') this.remainingMs();
    if (this.#state === 'running' || this.#state === 'paused' || this.#state === 'idle') {
      this.#state = 'cancelled';
      this.#deadline = null;
      this.#now = null;
    }
    return this;
  }

  dispose() {
    this.#deadline = null;
    this.#remainingMs = 0;
    this.#state = 'disposed';
    this.#now = null;
    return this;
  }

  #readNow() {
    const value = this.#now();
    if (!Number.isFinite(value)) throw new TypeError('now() must return a finite number');
    this.#lastNow = Math.max(this.#lastNow, value);
    return this.#lastNow;
  }
}

/** Rounds up so a positive partial second remains visible as one second. */
export function formatClock(remainingMs) {
  if (!Number.isFinite(remainingMs) || remainingMs < 0) {
    throw new RangeError('remainingMs must be a finite non-negative number');
  }
  const totalSeconds = BigInt(Math.ceil(remainingMs / 1000));
  const minutes = totalSeconds / 60n;
  const seconds = totalSeconds % 60n;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Describes digit changes as data; rendering and CSS transitions belong to the caller. */
export function digitTransitions(previous, next) {
  if (typeof previous !== 'string' || typeof next !== 'string' ||
      !/^\d+:[0-5]\d$/.test(previous) || !/^\d+:[0-5]\d$/.test(next) ||
      previous.length !== next.length) {
    throw new TypeError('previous and next must be equal-width ASCII clock strings');
  }
  return [...next].map((digit, position) => ({
    position,
    from: previous[position],
    to: digit,
    changed: previous[position] !== digit,
  }));
}
