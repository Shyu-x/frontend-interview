import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyIntegrity } from './integrity-check.mjs';

const digest = (algorithm, bytes) => `${algorithm}-${createHash(algorithm).update(bytes).digest('base64')}`;
test('accepts matching SHA-512 and rejects altered bytes', () => {
  const data = Buffer.from('package archive');
  assert.equal(verifyIntegrity(data, digest('sha512', data)), true);
  assert.equal(verifyIntegrity(Buffer.from('tampered'), digest('sha512', data)), false);
});
test('checks strongest available algorithm when hashes coexist', () => {
  const data = Buffer.from('x');
  assert.equal(verifyIntegrity(data, `${digest('sha256', data)} ${digest('sha512', Buffer.from('wrong'))}`), false);
  assert.equal(verifyIntegrity(data, `${digest('sha256', Buffer.from('wrong'))} ${digest('sha512', data)}`), true);
});
test('fails closed for malformed and unsupported tokens', () => {
  assert.throws(() => verifyIntegrity(Buffer.from('x'), 'sha999-aaaa'), /unsupported/);
  assert.throws(() => verifyIntegrity(Buffer.from('x'), 'not-a-digest'), TypeError);
});
