/**
 * A small numeric animation engine. Time is measured in milliseconds.
 * The scheduler must provide request(callback), cancel(id), and now().
 */
export class AnimationEngine {
  #scheduler;
  #animations = new Set();
  #frameId = null;
  #lastTime = -Infinity;

  constructor(scheduler = browserScheduler()) {
    if (!scheduler || typeof scheduler.request !== 'function' ||
        typeof scheduler.cancel !== 'function' || typeof scheduler.now !== 'function') {
      throw new TypeError('scheduler requires request, cancel, and now functions');
    }
    this.#scheduler = scheduler;
  }

  animate(options) {
    const config = validateOptions(options);
    const start = this.#readTime();
    const animation = {
      ...config, state: 'running', startedAt: start + config.delay,
      pausedAt: null, elapsedBeforePause: 0, onUpdate: options.onUpdate,
      onComplete: options.onComplete, onError: options.onError,
      handle: null,
    };
    const handle = {
      get state() { return animation.state; },
      get value() { return animation.value; },
      pause: () => this.#pause(animation),
      resume: () => this.#resume(animation),
      cancel: () => this.#settle(animation, 'cancelled'),
      finish: () => this.#finish(animation),
    };
    animation.handle = handle;
    animation.value = config.from;
    this.#animations.add(animation);
    if (config.duration === 0) {
      this.#complete(animation);
    } else {
      this.#requestFrame();
    }
    return handle;
  }

  get activeCount() { return this.#animations.size; }

  #requestFrame() {
    if (this.#frameId !== null || !this.#hasRunning()) return;
    this.#frameId = this.#scheduler.request((timestamp) => {
      this.#frameId = null;
      this.#tick(timestamp);
    });
  }

  #tick(timestamp) {
    if (!Number.isFinite(timestamp)) {
      for (const animation of [...this.#animations]) {
        if (animation.state === 'running') this.#fail(animation, new TypeError('frame timestamp must be finite'));
      }
      this.#requestFrame();
      return;
    }
    // A non-monotonic clock must not rewind already-rendered values.
    const time = this.#normalizeTime(timestamp);
    for (const animation of [...this.#animations]) {
      if (animation.state !== 'running' || time < animation.startedAt) continue;
      const elapsed = Math.max(0, time - animation.startedAt + animation.elapsedBeforePause);
      const progress = Math.min(1, elapsed / animation.duration);
      let eased;
      try { eased = animation.easing(progress); }
      catch (error) { this.#fail(animation, error); continue; }
      if (!Number.isFinite(eased)) {
        this.#fail(animation, new RangeError('easing must return a finite number'));
        continue;
      }
      // Weighted interpolation avoids overflowing (to - from) for opposite extreme endpoints.
      const value = animation.from * (1 - eased) + animation.to * eased;
      if (!Number.isFinite(value)) {
        this.#fail(animation, new RangeError('interpolated value must be finite'));
        continue;
      }
      if (progress === 1) this.#complete(animation);
      else this.#render(animation, value);
    }
    this.#requestFrame();
  }

  #render(animation, value) {
    animation.value = value;
    if (typeof animation.onUpdate === 'function') {
      try { animation.onUpdate(value, animation.handle); }
      catch (error) { this.#report(error, animation); }
    }
  }

  #report(error, animation) {
    if (animation && typeof animation.onError === 'function') {
      try { animation.onError(error, animation.handle); } catch { /* callbacks cannot break the scheduler */ }
    }
  }

  #pause(animation) {
    if (animation.state !== 'running') return animation.handle;
    const time = this.#readTime();
    animation.pausedAt = time;
    animation.elapsedBeforePause += Math.max(0, animation.pausedAt - animation.startedAt);
    animation.state = 'paused';
    this.#stopIfIdle();
    return animation.handle;
  }

  #resume(animation) {
    if (animation.state !== 'paused') return animation.handle;
    const time = this.#readTime();
    const remainingDelay = Math.max(0, animation.startedAt - animation.pausedAt);
    animation.startedAt = time + remainingDelay;
    animation.pausedAt = null;
    animation.state = 'running';
    this.#requestFrame();
    return animation.handle;
  }

  #finish(animation) {
    if (this.#isTerminal(animation.state)) return animation.handle;
    this.#complete(animation);
    return animation.handle;
  }

  #complete(animation) {
    if (this.#isTerminal(animation.state)) return animation.handle;
    // Commit the terminal state before callbacks so finish() from onUpdate is idempotent.
    this.#animations.delete(animation);
    animation.state = 'finished';
    this.#render(animation, animation.to);
    if (typeof animation.onComplete === 'function') {
      try { animation.onComplete(animation.handle); }
      catch (error) { this.#report(error, animation); }
    }
    this.#stopIfIdle();
    return animation.handle;
  }

  #settle(animation, state) {
    if (this.#isTerminal(animation.state)) return animation.handle;
    this.#animations.delete(animation);
    animation.state = state;
    this.#stopIfIdle();
    return animation.handle;
  }

  #fail(animation, error) {
    if (this.#isTerminal(animation.state)) return animation.handle;
    this.#animations.delete(animation);
    animation.state = 'failed';
    this.#report(error, animation);
    this.#stopIfIdle();
    return animation.handle;
  }

  #hasRunning() {
    return [...this.#animations].some((animation) => animation.state === 'running');
  }

  #isTerminal(state) {
    return state === 'finished' || state === 'cancelled' || state === 'failed';
  }

  #readTime() {
    const time = this.#scheduler.now();
    if (!Number.isFinite(time)) throw new TypeError('scheduler.now() must return a finite number');
    return this.#normalizeTime(time);
  }

  #normalizeTime(time) {
    this.#lastTime = Math.max(time, this.#lastTime);
    return this.#lastTime;
  }

  #stopIfIdle() {
    if (this.#hasRunning()) return;
    if (this.#frameId !== null) this.#scheduler.cancel(this.#frameId);
    this.#frameId = null;
  }
}

const easings = {
  linear: (progress) => progress,
  easeInOut: (progress) => progress < 0.5
    ? 2 * progress * progress
    : 1 - ((-2 * progress + 2) ** 2) / 2,
};

function validateOptions(options) {
  if (!options || typeof options !== 'object') throw new TypeError('options must be an object');
  const { from, to, duration, delay = 0, easing = 'linear' } = options;
  for (const [name, value] of Object.entries({ from, to, duration, delay })) {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  }
  if (duration < 0 || delay < 0) throw new RangeError('duration and delay must be non-negative');
  const easingFunction = typeof easing === 'function' ? easing : easings[easing];
  if (typeof easingFunction !== 'function') throw new TypeError('easing must be linear, easeInOut, or a function');
  return { from, to, duration, delay, easing: easingFunction };
}

function browserScheduler() {
  if (typeof globalThis.requestAnimationFrame !== 'function' ||
      typeof globalThis.cancelAnimationFrame !== 'function' ||
      typeof globalThis.performance?.now !== 'function') {
    throw new Error('Provide a scheduler outside browsers');
  }
  return {
    request: (callback) => globalThis.requestAnimationFrame(callback),
    cancel: (id) => globalThis.cancelAnimationFrame(id),
    now: () => globalThis.performance.now(),
  };
}
