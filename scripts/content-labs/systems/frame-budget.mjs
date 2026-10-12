import assert from 'node:assert/strict';

// 不接触实际 codec/GPU；验证背压和所有权模型中的有界内存。
let live = 0, peak = 0, closed = 0;
const queue = [];
const limit = 3;
const frame = timestamp => {
  live++; peak = Math.max(peak, live);
  let released = false;
  return { timestamp, close() {
    assert.equal(released, false, 'double close');
    released = true; live--; closed++;
  } };
};
for (let i = 0; i < 20; i++) {
  // 在生产下一帧前淘汰旧帧；直播允许丢旧帧，导出则应暂停上游。
  if (queue.length === limit) queue.shift().close();
  queue.push(frame(i * 33333));
}
assert.equal(queue.length, limit);
assert.deepEqual(queue.map(item => item.timestamp), [566661, 599994, 633327]);
for (const item of queue) item.close();
assert.equal(live, 0); assert.equal(closed, 20); assert.equal(peak, limit);
const yuv420Bytes = 1920 * 1080 * 1.5;
assert.equal(yuv420Bytes, 3110400);
console.log('frame ownership: peak=3, closed=20, live=0; YUV420 estimate=3110400 bytes: PASS');
