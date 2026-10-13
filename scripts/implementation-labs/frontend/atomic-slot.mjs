// Shared single-slot protocol: even sequence means empty; odd means published.
export function createSlot() {
  return { sequence: new Int32Array(new SharedArrayBuffer(4)), value: new Int32Array(new SharedArrayBuffer(4)) };
}
export function publish(slot, value) {
  const sequence = Atomics.load(slot.sequence, 0);
  if (sequence % 2 !== 0) return false; // Refuse overwrite until the consumer releases this slot.
  Atomics.store(slot.value, 0, value);
  Atomics.store(slot.sequence, 0, sequence + 1); // Publish marker follows payload write.
  Atomics.notify(slot.sequence, 0);
  return true;
}
export function consume(slot) {
  const sequence = Atomics.load(slot.sequence, 0);
  if (sequence % 2 === 0) return null;
  const value = Atomics.load(slot.value, 0);
  Atomics.store(slot.sequence, 0, sequence + 1); // Even marker releases the slot.
  return value;
}
