import assert from 'node:assert/strict';

// This stable workload gives V8 a hot call site; the trace flags are diagnostic,
// while the assertion checks program semantics rather than a tiering schedule.
function sumNumbers(values) {
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    total += values[index];
  }
  return total;
}

const input = Array.from({ length: 128 }, (_, index) => index);
let observed = 0;
for (let run = 0; run < 20_000; run += 1) {
  observed = sumNumbers(input);
}

assert.equal(observed, 8_128);
console.log(`runs=20000 result=${observed}`);
