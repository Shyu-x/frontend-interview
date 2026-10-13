import test from 'node:test';
import assert from 'node:assert/strict';
import { SseParser } from './sse-parser.mjs';

test('handles split UTF-8 code points and multiline data', () => {
  const parser = new SseParser(); const bytes = new TextEncoder().encode('data: 你好\ndata: 世界\n\n');
  const split = bytes.indexOf(0xE4) + 1;
  assert.deepEqual(parser.push(bytes.slice(0, split)), []);
  assert.deepEqual(parser.push(bytes.slice(split)), [{ data: '你好\n世界', event: 'message', id: '', retry: undefined }]);
});
test('parses event metadata and ignores comments', () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push(new TextEncoder().encode(': ping\nevent: update\nid: 7\nretry: 1200\ndata: x\n\n')),
    [{ data: 'x', event: 'update', id: '7', retry: 1200 }]);
});
test('dispatches empty data and ignores NUL in id', () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push(new TextEncoder().encode('id: bad\0id\ndata:\n\n')),
    [{ data: '', event: 'message', id: '', retry: undefined }]);
});
test('preserves an explicit newline as non-empty event data', () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push(new TextEncoder().encode('data:\ndata: second\n\n')),
    [{ data: '\nsecond', event: 'message', id: '', retry: undefined }]);
});
test('discards a final event without a blank-line delimiter', () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push(new TextEncoder().encode('data: tail'), { final: true }), []);
});
test('does not treat LF completing a split CRLF as a second line ending', () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push(new TextEncoder().encode('data: split\r')), []);
  assert.deepEqual(parser.push(new TextEncoder().encode('\n')), []);
  assert.deepEqual(parser.push(new TextEncoder().encode('\r\n')), [{ data: 'split', event: 'message', id: '', retry: undefined }]);
});
test('rejects data after EOF and ignores retry values outside safe integer range', () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push(new TextEncoder().encode(`retry: ${Number.MAX_SAFE_INTEGER + 1}\ndata: ok\n\n`)),
    [{ data: 'ok', event: 'message', id: '', retry: undefined }]);
  parser.push(new Uint8Array(), { final: true });
  assert.throws(() => parser.push(new Uint8Array()), /ended/);
});
