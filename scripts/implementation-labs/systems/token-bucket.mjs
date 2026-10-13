// A monotonic-time token bucket. Capacity bounds bursts; refillPerSecond bounds sustained work.
export class TokenBucket {
  #tokens; #last;
  constructor({ capacity, refillPerSecond, now = () => performance.now() }) {
    if (!(capacity > 0) || !(refillPerSecond > 0)) throw new RangeError('capacity and refill rate must be positive');
    this.capacity = capacity; this.refillPerSecond = refillPerSecond; this.now = now;
    this.#tokens = capacity; this.#last = now();
  }
  take(cost = 1) {
    if (!(cost > 0) || cost > this.capacity) throw new RangeError('cost must be positive and no larger than capacity');
    const now = this.now();
    if (now < this.#last) throw new RangeError('clock must be monotonic');
    this.#tokens = Math.min(this.capacity, this.#tokens + (now - this.#last) * this.refillPerSecond / 1000);
    this.#last = now;
    if (this.#tokens < cost) return { allowed: false, retryAfterMs: Math.ceil((cost - this.#tokens) * 1000 / this.refillPerSecond) };
    this.#tokens -= cost;
    return { allowed: true, remaining: this.#tokens };
  }
}
