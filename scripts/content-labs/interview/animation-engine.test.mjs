import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimationEngine } from './animation-engine.mjs';
import { ManualClock } from './manual-clock.mjs';

function setup() {
  const clock = new ManualClock();
  return { clock, engine: new AnimationEngine(clock) };
}

test('interpolates from the first eligible frame using elapsed time', () => {
  const { clock, engine } = setup();
  const values = [];
  const animation = engine.animate({ from: 10, to: 30, duration: 100, onUpdate: (value) => values.push(value) });
  clock.frame(0);
  clock.frame(25);
  assert.deepEqual(values, [10, 15]);
  assert.equal(animation.state, 'running');
});

test('clamps completion to the exact endpoint and calls complete once', () => {
  const { clock, engine } = setup();
  const values = [];
  let completed = 0;
  const animation = engine.animate({ from: 4, to: 12, duration: 50, onUpdate: (v) => values.push(v), onComplete: () => completed++ });
  clock.frame(0);
  clock.frame(70);
  clock.frame(100);
  assert.equal(values.at(-1), 12);
  assert.equal(completed, 1);
  assert.equal(animation.state, 'finished');
  assert.equal(engine.activeCount, 0);
  assert.equal(clock.pendingFrames, 0);
});

test('applies configured delay without rendering early', () => {
  const { clock, engine } = setup();
  const values = [];
  engine.animate({ from: 0, to: 1, duration: 20, delay: 10, onUpdate: (v) => values.push(v) });
  clock.frame(9);
  assert.deepEqual(values, []);
  clock.frame(10);
  assert.deepEqual(values, [0]);
});

test('easeInOut is applied to normalized progress', () => {
  const { clock, engine } = setup();
  const values = [];
  engine.animate({ from: 0, to: 100, duration: 100, easing: 'easeInOut', onUpdate: (v) => values.push(v) });
  clock.frame(0);
  clock.frame(25);
  assert.equal(values.at(-1), 12.5);
});

test('accepts a custom easing function', () => {
  const { clock, engine } = setup();
  let value = 0;
  engine.animate({ from: 0, to: 10, duration: 100, easing: (p) => p * p, onUpdate: (v) => value = v });
  clock.frame(0);
  clock.frame(50);
  assert.equal(value, 2.5);
});

test('one scheduled frame updates all active animations', () => {
  const { clock, engine } = setup();
  const seen = [];
  engine.animate({ from: 0, to: 10, duration: 100, onUpdate: (v) => seen.push(`a${v}`) });
  engine.animate({ from: 0, to: 20, duration: 100, onUpdate: (v) => seen.push(`b${v}`) });
  assert.equal(clock.pendingFrames, 1);
  clock.frame(0);
  assert.deepEqual(seen, ['a0', 'b0']);
  assert.equal(clock.pendingFrames, 1);
});

test('pause freezes progress and releases the shared frame while idle', () => {
  const { clock, engine } = setup();
  const values = [];
  const animation = engine.animate({ from: 0, to: 100, duration: 100, onUpdate: (v) => values.push(v) });
  clock.frame(0);
  clock.frame(30);
  animation.pause();
  assert.equal(animation.state, 'paused');
  assert.equal(clock.pendingFrames, 0);
  clock.frame(80);
  assert.equal(values.at(-1), 30);
});

test('resume continues from retained progress instead of restarting', () => {
  const { clock, engine } = setup();
  const values = [];
  const animation = engine.animate({ from: 0, to: 100, duration: 100, onUpdate: (v) => values.push(v) });
  clock.frame(0);
  clock.frame(30);
  animation.pause();
  clock.frame(80);
  animation.resume();
  clock.frame(80);
  clock.frame(100);
  assert.equal(values.at(-1), 50);
});

test('pause during delay preserves the remaining delay', () => {
  const { clock, engine } = setup();
  const values = [];
  const animation = engine.animate({ from: 0, to: 10, duration: 10, delay: 10, onUpdate: (v) => values.push(v) });
  animation.pause();
  clock.frame(100);
  animation.resume();
  clock.frame(109);
  assert.deepEqual(values, []);
  clock.frame(110);
  assert.deepEqual(values, [0]);
});

test('cancel is idempotent and never calls completion', () => {
  const { clock, engine } = setup();
  let completed = 0;
  const animation = engine.animate({ from: 0, to: 1, duration: 100, onComplete: () => completed++ });
  animation.cancel();
  animation.cancel();
  assert.equal(animation.state, 'cancelled');
  assert.equal(completed, 0);
  assert.equal(engine.activeCount, 0);
  assert.equal(clock.pendingFrames, 0);
});

test('finish jumps to end and completes once', () => {
  const { clock, engine } = setup();
  const values = [];
  let completed = 0;
  const animation = engine.animate({ from: 2, to: 8, duration: 100, delay: 50, onUpdate: (v) => values.push(v), onComplete: () => completed++ });
  animation.finish();
  animation.finish();
  assert.equal(values.at(-1), 8);
  assert.equal(completed, 1);
  assert.equal(animation.state, 'finished');
  assert.equal(clock.pendingFrames, 0);
});

test('zero duration renders and completes synchronously without a frame', () => {
  const { clock, engine } = setup();
  const values = [];
  let completed = 0;
  const animation = engine.animate({ from: -1, to: 5, duration: 0, delay: 100, onUpdate: (v) => values.push(v), onComplete: () => completed++ });
  assert.deepEqual(values, [5]);
  assert.equal(completed, 1);
  assert.equal(animation.state, 'finished');
  assert.equal(clock.pendingFrames, 0);
});

test('a backwards timestamp cannot reduce the value', () => {
  const { clock, engine } = setup();
  let value = 0;
  engine.animate({ from: 0, to: 100, duration: 100, onUpdate: (v) => value = v });
  clock.frame(20);
  clock.frame(50);
  clock.frame(10);
  assert.equal(value, 50);
});

test('invalid scalar options are rejected', () => {
  const { engine } = setup();
  for (const options of [
    { from: NaN, to: 1, duration: 1 },
    { from: 0, to: Infinity, duration: 1 },
    { from: 0, to: 1, duration: -1 },
    { from: 0, to: 1, duration: 1, delay: -1 },
    { from: 0, to: 1, duration: 1, easing: 'spring' },
    null,
  ]) assert.throws(() => engine.animate(options));
  assert.equal(engine.activeCount, 0);
});

test('rejects an invalid scheduler at construction', () => {
  assert.throws(() => new AnimationEngine({ request() {}, cancel() {} }), /now/);
});

test('onUpdate exceptions are routed and do not stop later frames', () => {
  const { clock, engine } = setup();
  const errors = [];
  let laterValue;
  const animation = engine.animate({
    from: 0, to: 10, duration: 10,
    onUpdate() { throw new Error('consumer update'); },
    onError: (error) => errors.push(error.message),
  });
  engine.animate({ from: 0, to: 1, duration: 10, onUpdate: (v) => laterValue = v });
  clock.frame(0);
  clock.frame(10);
  assert.equal(laterValue, 1);
  assert.ok(errors.length >= 2);
  assert.equal(animation.state, 'finished');
});

test('onComplete exceptions are reported after state has settled', () => {
  const { clock, engine } = setup();
  const errors = [];
  const animation = engine.animate({
    from: 0, to: 1, duration: 1,
    onComplete() { throw new Error('consumer complete'); },
    onError: (error) => errors.push(error.message),
  });
  clock.frame(0);
  clock.frame(1);
  assert.equal(animation.state, 'finished');
  assert.deepEqual(errors, ['consumer complete']);
});

test('pausing the final running item cancels the pending request', () => {
  const { clock, engine } = setup();
  const animation = engine.animate({ from: 0, to: 1, duration: 50 });
  assert.equal(clock.pendingFrames, 1);
  animation.pause();
  assert.equal(clock.pendingFrames, 0);
  assert.equal(clock.cancelledFrames, 1);
});

test('a paused animation keeps the engine frame alive for another animation', () => {
  const { clock, engine } = setup();
  const first = engine.animate({ from: 0, to: 1, duration: 100 });
  first.pause();
  const second = engine.animate({ from: 0, to: 2, duration: 100 });
  assert.equal(clock.pendingFrames, 1);
  clock.frame(0);
  assert.equal(second.state, 'running');
  assert.equal(engine.activeCount, 2);
});

test('each animation can finish while its peer continues', () => {
  const { clock, engine } = setup();
  const short = engine.animate({ from: 0, to: 1, duration: 10 });
  const long = engine.animate({ from: 0, to: 2, duration: 30 });
  clock.frame(0);
  clock.frame(10);
  assert.equal(short.state, 'finished');
  assert.equal(long.state, 'running');
  assert.equal(clock.pendingFrames, 1);
});

test('repeated pause and resume calls preserve one active frame request', () => {
  const { clock, engine } = setup();
  const animation = engine.animate({ from: 0, to: 1, duration: 100 });
  animation.pause();
  animation.pause();
  animation.resume();
  animation.resume();
  assert.equal(clock.pendingFrames, 1);
  assert.equal(animation.state, 'running');
});

test('pausing from onUpdate does not create an empty frame loop', () => {
  const { clock, engine } = setup();
  let animation;
  animation = engine.animate({ from: 0, to: 1, duration: 100, onUpdate: () => animation.pause() });
  clock.frame(0);
  assert.equal(animation.state, 'paused');
  assert.equal(clock.pendingFrames, 0);
  clock.frame(50);
  assert.equal(clock.pendingFrames, 0);
});

test('a throwing custom easing fails only its animation and reports the error', () => {
  const { clock, engine } = setup();
  const errors = [];
  let peerValue;
  const broken = engine.animate({
    from: 0, to: 1, duration: 20,
    easing() { throw new Error('bad easing'); },
    onError: (error) => errors.push(error.message),
  });
  const peer = engine.animate({ from: 0, to: 2, duration: 20, onUpdate: (value) => peerValue = value });
  clock.frame(0);
  assert.equal(broken.state, 'failed');
  assert.deepEqual(errors, ['bad easing']);
  assert.equal(peerValue, 0);
  assert.equal(peer.state, 'running');
  clock.frame(10);
  assert.equal(peerValue, 1);
});

test('a custom easing returning a non-finite value fails cleanly', () => {
  const { clock, engine } = setup();
  const errors = [];
  const animation = engine.animate({
    from: 0, to: 1, duration: 10,
    easing: () => NaN,
    onError: (error) => errors.push(error.message),
  });
  clock.frame(0);
  assert.equal(animation.state, 'failed');
  assert.match(errors[0], /finite/);
  assert.equal(engine.activeCount, 0);
  assert.equal(clock.pendingFrames, 0);
});

test('finish called from onUpdate is re-entrant but completes only once', () => {
  const { clock, engine } = setup();
  const values = [];
  const finalUpdateStates = [];
  let completed = 0;
  let animation;
  animation = engine.animate({
    from: 0, to: 10, duration: 100,
    onUpdate: (value, handle) => { values.push(value); finalUpdateStates.push(handle.state); animation.finish(); },
    onComplete: (handle) => { assert.equal(handle.state, 'finished'); completed++; },
  });
  clock.frame(0);
  assert.deepEqual(values, [0, 10]);
  assert.equal(animation.state, 'finished');
  assert.equal(finalUpdateStates.at(-1), 'finished');
  assert.equal(completed, 1);
  assert.equal(engine.activeCount, 0);
});

test('pause and resume use the monotonic scheduler time', () => {
  const { clock, engine } = setup();
  let value;
  const animation = engine.animate({ from: 0, to: 100, duration: 100, onUpdate: (next) => value = next });
  clock.frame(20);
  clock.frame(50);
  animation.pause();
  clock.frame(10);
  animation.resume();
  clock.frame(20);
  assert.equal(value, 50);
});

test('weighted interpolation supports extreme finite endpoints', () => {
  const { clock, engine } = setup();
  let value;
  const animation = engine.animate({
    from: Number.MAX_VALUE, to: -Number.MAX_VALUE, duration: 10,
    onUpdate: (next) => value = next,
  });
  clock.frame(0);
  clock.frame(5);
  assert.equal(value, 0);
  assert.equal(animation.state, 'running');
});
