/** Timeline model for revealing text by Unicode grapheme cluster. */
export class TypewriterTimeline {
  #segments;
  #intervalMs;
  #initialDelayMs;
  #batchSize;
  #now;
  #lastNow = -Infinity;
  #segmentStartedAt = null;
  #elapsedBeforeSegment = 0;
  #revealed = 0;
  #state = 'idle';

  constructor({ text, intervalMs, initialDelayMs = 0, batchSize = 1, locale, now }) {
    if (typeof text !== 'string') throw new TypeError('text must be a string');
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) throw new RangeError('intervalMs must be positive and finite');
    if (!Number.isFinite(initialDelayMs) || initialDelayMs < 0) throw new RangeError('initialDelayMs must be non-negative and finite');
    if (!Number.isInteger(batchSize) || batchSize <= 0) throw new RangeError('batchSize must be a positive integer');
    if (typeof now !== 'function') throw new TypeError('now must be a function');
    if (typeof Intl.Segmenter !== 'function') throw new Error('Intl.Segmenter is required');
    this.#segments = [...new Intl.Segmenter(locale, { granularity: 'grapheme' }).segment(text)]
      .map(({ segment }) => segment);
    this.#intervalMs = intervalMs;
    this.#initialDelayMs = initialDelayMs;
    this.#batchSize = batchSize;
    this.#now = now;
  }

  get state() { return this.#state; }
  get graphemeCount() { return this.#segments.length; }

  start() {
    if (this.#state !== 'idle') return this;
    this.#segmentStartedAt = this.#readNow();
    this.#state = 'running';
    if (this.#segments.length === 0) {
      this.#state = 'finished';
      this.#now = null;
    }
    return this;
  }

  update() {
    if (this.#state !== 'running') return this.snapshot();
    return this.#updateAt(this.#readNow());
  }

  #updateAt(now) {
    const elapsed = this.#elapsedBeforeSegment + Math.max(0, now - this.#segmentStartedAt);
    const activeElapsed = Math.max(0, elapsed - this.#initialDelayMs);
    const intervals = Math.floor(activeElapsed / this.#intervalMs);
    this.#revealed = Math.min(this.#segments.length, intervals * this.#batchSize);
    if (this.#revealed === this.#segments.length) {
      this.#state = 'finished';
      this.#now = null;
    }
    return this.snapshot();
  }

  snapshot() {
    return {
      state: this.#state,
      revealedCount: this.#revealed,
      totalCount: this.#segments.length,
      visibleText: this.#segments.slice(0, this.#revealed).join(''),
      done: this.#state === 'finished',
    };
  }

  pause() {
    if (this.#state !== 'running') return this;
    const now = this.#readNow();
    this.#updateAt(now);
    if (this.#state === 'running') {
      this.#elapsedBeforeSegment += Math.max(0, now - this.#segmentStartedAt);
      this.#segmentStartedAt = null;
      this.#state = 'paused';
    }
    return this;
  }

  resume() {
    if (this.#state !== 'paused') return this;
    this.#segmentStartedAt = this.#readNow();
    this.#state = 'running';
    return this;
  }

  fastForward() {
    if (this.#state === 'running' || this.#state === 'paused' || this.#state === 'idle') {
      this.#revealed = this.#segments.length;
      this.#state = 'finished';
      this.#segmentStartedAt = null;
      this.#now = null;
    }
    return this.snapshot();
  }

  cancel() {
    if (this.#state === 'running' || this.#state === 'paused' || this.#state === 'idle') {
      this.#state = 'cancelled';
      this.#segmentStartedAt = null;
      this.#now = null;
    }
    return this.snapshot();
  }

  dispose() {
    this.#segments = [];
    this.#revealed = 0;
    this.#segmentStartedAt = null;
    this.#elapsedBeforeSegment = 0;
    this.#state = 'disposed';
    this.#now = null;
    return this.snapshot();
  }

  #readNow() {
    const value = this.#now();
    if (!Number.isFinite(value)) throw new TypeError('now() must return a finite number');
    this.#lastNow = Math.max(this.#lastNow, value);
    return this.#lastNow;
  }
}
