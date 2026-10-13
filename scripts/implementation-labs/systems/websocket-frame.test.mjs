import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeFrame } from './websocket-frame.mjs';

function clientFrame(payload) {
  const bytes = Buffer.from(payload), mask = Buffer.from([1, 2, 3, 4]);
  const header = Buffer.from([0x81, 0x80 | bytes.length]);
  const body = Buffer.from(bytes); for (let i = 0; i < body.length; i++) body[i] ^= mask[i & 3];
  return Buffer.concat([header, mask, body]);
}
test('decodes masked payload and reports bytes consumed', () => {
  const frame = clientFrame('hi');
  assert.deepEqual(decodeFrame(frame), { frame: { fin: true, opcode: 1, payload: Buffer.from('hi') }, bytesRead: frame.length });
});
test('returns null for incomplete header, mask, and payload', () => {
  const frame = clientFrame('hello');
  for (let i = 0; i < frame.length; i++) assert.equal(decodeFrame(frame.subarray(0, i)), null);
});
test('rejects unmasked, fragmented, RSV, and oversized frames', () => {
  assert.throws(() => decodeFrame(Buffer.from([0x81, 0x00])), /masked/);
  assert.throws(() => decodeFrame(Buffer.from([0x01, 0x80, 1, 2, 3, 4])), /fragmented/);
  assert.throws(() => decodeFrame(Buffer.from([0xC1, 0x80, 1, 2, 3, 4])), /RSV/);
  assert.throws(() => decodeFrame(Buffer.from([0x81, 0xFE, 0, 126, 1, 2, 3, 4]), { maxPayload: 64 }), /limit/);
});
test('rejects unknown opcodes and malformed control payload sizes', () => {
  const masked = (opcode, length) => Buffer.from([0x80 | opcode, 0x80 | length, 1, 2, 3, 4, ...new Array(length).fill(0)]);
  assert.throws(() => decodeFrame(masked(3, 0)), /opcode/);
  assert.throws(() => decodeFrame(masked(9, 126)), /control frame/);
  assert.throws(() => decodeFrame(masked(8, 1)), /one-byte/);
});
