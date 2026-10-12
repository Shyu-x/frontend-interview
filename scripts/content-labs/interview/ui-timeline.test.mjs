import test from 'node:test';
import assert from 'node:assert/strict';
import { DeadlineClock, digitTransitions, formatClock } from './deadline-clock.mjs';
import { TypewriterTimeline } from './typewriter-timeline.mjs';

function testClock(initial = 0) {
  let time = initial;
  return { now: () => time, set: (next) => { time = next; } };
}

test('countdown derives remaining time from one absolute deadline', () => {
  const clock = testClock(1000);
  const timer = new DeadlineClock({ durationMs: 5000, now: clock.now }).start();
  clock.set(2750);
  assert.equal(timer.remainingMs(), 3250);
  clock.set(4000);
  assert.equal(timer.remainingMs(), 2000);
});

test('polling a deadline repeatedly does not accumulate tick drift', () => {
  const clock = testClock();
  const timer = new DeadlineClock({ durationMs: 1000, now: clock.now }).start();
  for (let i = 0; i < 60; i++) timer.remainingMs();
  clock.set(333.25);
  assert.equal(timer.remainingMs(), 666.75);
});

test('formats partial seconds by rounding up and carries across a minute', () => {
  assert.equal(formatClock(1), '00:01');
  assert.equal(formatClock(1000), '00:01');
  assert.equal(formatClock(60000), '01:00');
  assert.equal(formatClock(60001), '01:01');
  assert.equal(formatClock(3600000), '60:00');
  assert.doesNotMatch(formatClock(Number.MAX_VALUE), /e/);
});

test('deadline expires exactly at zero and remains finished', () => {
  const clock = testClock(50);
  const timer = new DeadlineClock({ durationMs: 300, now: clock.now }).start();
  clock.set(350);
  assert.deepEqual(timer.snapshot(), { state: 'finished', remainingMs: 0, display: '00:00' });
  clock.set(500);
  assert.equal(timer.remainingMs(), 0);
});

test('a large clock jump models a background return without replaying ticks', () => {
  const clock = testClock(0);
  const timer = new DeadlineClock({ durationMs: 10000, now: clock.now }).start();
  clock.set(25000);
  assert.equal(timer.snapshot().state, 'finished');
  assert.equal(timer.snapshot().remainingMs, 0);
});

test('pause and resume preserve remaining duration while excluding paused time', () => {
  const clock = testClock(0);
  const timer = new DeadlineClock({ durationMs: 5000, now: clock.now }).start();
  clock.set(1200);
  timer.pause();
  assert.equal(timer.remainingMs(), 3800);
  clock.set(9000);
  assert.equal(timer.remainingMs(), 3800);
  timer.resume();
  clock.set(10000);
  assert.equal(timer.remainingMs(), 2800);
});

test('a backwards clock reading cannot increase the remaining duration', () => {
  const clock = testClock(100);
  const timer = new DeadlineClock({ durationMs: 1000, now: clock.now }).start();
  clock.set(500);
  assert.equal(timer.remainingMs(), 600);
  clock.set(200);
  assert.equal(timer.remainingMs(), 600);
});

test('cancel retains a stable snapshot and dispose releases the view state', () => {
  const clock = testClock(0);
  const timer = new DeadlineClock({ durationMs: 1000, now: clock.now }).start();
  clock.set(250);
  timer.cancel();
  clock.set(900);
  assert.equal(timer.snapshot().state, 'cancelled');
  assert.equal(timer.remainingMs(), 750);
  timer.dispose();
  assert.deepEqual(timer.snapshot(), { state: 'disposed', remainingMs: 0, display: '00:00' });
});

test('rejects invalid duration, clock values, and formatted values', () => {
  for (const durationMs of [-1, Infinity, NaN]) {
    assert.throws(() => new DeadlineClock({ durationMs, now: () => 0 }));
  }
  const badClock = new DeadlineClock({ durationMs: 100, now: () => NaN });
  assert.throws(() => badClock.start(), /finite/);
  assert.throws(() => formatClock(-1));
  assert.throws(() => formatClock(Infinity));
});

test('rejects a deadline that overflows the supplied clock range', () => {
  const timer = new DeadlineClock({ durationMs: Number.MAX_VALUE, now: () => Number.MAX_VALUE });
  assert.throws(() => timer.start(), /range/);
  assert.equal(timer.state, 'idle');
});

test('digit transitions report old and new slots without assuming a CSS renderer', () => {
  assert.deepEqual(digitTransitions('01:00', '00:59'), [
    { position: 0, from: '0', to: '0', changed: false },
    { position: 1, from: '1', to: '0', changed: true },
    { position: 2, from: ':', to: ':', changed: false },
    { position: 3, from: '0', to: '5', changed: true },
    { position: 4, from: '0', to: '9', changed: true },
  ]);
});

test('digit transitions require fixed-width ASCII clock strings', () => {
  assert.throws(() => digitTransitions('01:00', '1:00'));
  assert.throws(() => digitTransitions('01:00', '01:0a'));
  assert.throws(() => digitTransitions('01:60', '01:59'));
});

test('segments emoji ZWJ sequences and combining marks as user-perceived units', () => {
  const clock = testClock();
  const text = 'A👩‍👩‍👧‍👦e\u0301中';
  const timeline = new TypewriterTimeline({ text, intervalMs: 10, now: clock.now }).start();
  assert.equal(timeline.graphemeCount, 4);
  clock.set(20);
  assert.equal(timeline.update().visibleText, 'A👩‍👩‍👧‍👦');
  clock.set(30);
  assert.equal(timeline.update().visibleText, 'A👩‍👩‍👧‍👦e\u0301');
});

test('reveals English and Chinese text one grapheme at each interval', () => {
  const clock = testClock();
  const timeline = new TypewriterTimeline({ text: 'Hi中文', intervalMs: 25, now: clock.now }).start();
  clock.set(25);
  assert.equal(timeline.update().visibleText, 'H');
  clock.set(75);
  assert.equal(timeline.update().visibleText, 'Hi中');
  clock.set(100);
  assert.equal(timeline.update().visibleText, 'Hi中文');
  assert.equal(timeline.state, 'finished');
});

test('initial delay and batch size determine the first visible chunk', () => {
  const clock = testClock();
  const timeline = new TypewriterTimeline({ text: 'ABCDE', intervalMs: 20, initialDelayMs: 40, batchSize: 2, now: clock.now }).start();
  clock.set(59);
  assert.equal(timeline.update().visibleText, '');
  clock.set(60);
  assert.equal(timeline.update().visibleText, 'AB');
  clock.set(100);
  assert.equal(timeline.update().visibleText, 'ABCDE');
});

test('long task catch-up is based on elapsed time rather than missed callback count', () => {
  const clock = testClock();
  const timeline = new TypewriterTimeline({ text: 'ABCDEFGH', intervalMs: 10, now: clock.now }).start();
  clock.set(55);
  assert.equal(timeline.update().visibleText, 'ABCDE');
  clock.set(80);
  assert.equal(timeline.update().visibleText, 'ABCDEFGH');
});

test('pause and resume freeze elapsed typing time', () => {
  const clock = testClock();
  const timeline = new TypewriterTimeline({ text: 'ABCD', intervalMs: 100, now: clock.now }).start();
  clock.set(150);
  timeline.pause();
  assert.equal(timeline.snapshot().visibleText, 'A');
  clock.set(5000);
  assert.equal(timeline.update().visibleText, 'A');
  timeline.resume();
  clock.set(5049);
  assert.equal(timeline.update().visibleText, 'A');
  clock.set(5050);
  assert.equal(timeline.update().visibleText, 'AB');
});

test('pause samples the injected clock once and resumes from that exact elapsed point', () => {
  let calls = 0;
  const timeline = new TypewriterTimeline({
    text: 'ABCDE', intervalMs: 10,
    now: () => (++calls) * 10,
  }).start();
  timeline.pause();
  timeline.resume();
  assert.equal(timeline.update().visibleText, 'AB');
});

test('backwards clock readings do not remove already revealed graphemes', () => {
  const clock = testClock(0);
  const timeline = new TypewriterTimeline({ text: 'ABC', intervalMs: 10, now: clock.now }).start();
  clock.set(20);
  assert.equal(timeline.update().visibleText, 'AB');
  clock.set(5);
  assert.equal(timeline.update().visibleText, 'AB');
});

test('fast-forward completes while cancel preserves the current prefix', () => {
  const clock = testClock();
  const fast = new TypewriterTimeline({ text: 'done', intervalMs: 1, now: clock.now });
  assert.equal(fast.fastForward().visibleText, 'done');
  assert.equal(fast.state, 'finished');
  const cancelled = new TypewriterTimeline({ text: 'later', intervalMs: 10, now: clock.now }).start();
  clock.set(20);
  cancelled.update();
  cancelled.cancel();
  assert.equal(cancelled.state, 'cancelled');
  assert.equal(cancelled.snapshot().visibleText, 'la');
});

test('empty text completes on start and disposal releases grapheme storage', () => {
  const clock = testClock();
  const empty = new TypewriterTimeline({ text: '', intervalMs: 5, now: clock.now }).start();
  assert.equal(empty.state, 'finished');
  const timeline = new TypewriterTimeline({ text: '文字', intervalMs: 5, now: clock.now }).start();
  assert.equal(timeline.dispose().totalCount, 0);
  assert.equal(timeline.state, 'disposed');
});

test('rejects invalid typewriter input and non-finite runtime clock values', () => {
  for (const options of [
    { text: 'x', intervalMs: 0, now: () => 0 },
    { text: 'x', intervalMs: 1, batchSize: 0, now: () => 0 },
    { text: 1, intervalMs: 1, now: () => 0 },
    { text: 'x', intervalMs: 1, now: 1 },
  ]) assert.throws(() => new TypewriterTimeline(options));
  let value = 0;
  const timeline = new TypewriterTimeline({ text: 'x', intervalMs: 10, now: () => value }).start();
  value = Infinity;
  assert.throws(() => timeline.update(), /finite/);
});
