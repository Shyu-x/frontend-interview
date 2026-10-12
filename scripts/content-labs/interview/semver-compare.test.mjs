import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, parseVersion } from './semver-compare.mjs';

const sequence = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta',
  '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0'];
test('prerelease precedence checks all pairs, not a lexical label ranking', () => {
  for (let i = 0; i < sequence.length; i++) {
    for (let j = 0; j < sequence.length; j++) assert.equal(compareVersions(sequence[i], sequence[j]), Math.sign(i - j));
  }
});
test('core components compare numerically and preserve integers beyond Number precision', () => {
  assert.equal(compareVersions('1.10.0', '1.9.99'), 1);
  assert.equal(compareVersions('9007199254740993.0.0', '9007199254740992.0.0'), 1);
});
test('build metadata has no precedence but is syntactically validated', () => {
  assert.equal(compareVersions('1.2.3+build.001', '1.2.3+other'), 0);
  assert.deepEqual(parseVersion('1.2.3+001').build, ['001']);
  assert.throws(() => parseVersion('1.2.3+'), /invalid/);
});
test('numeric IDs precede nonnumeric IDs; ASCII ordering is explicit', () => {
  assert.equal(compareVersions('1.2.3-9', '1.2.3-alpha'), -1);
  assert.equal(compareVersions('1.2.3-A', '1.2.3-a'), -1);
  assert.equal(compareVersions('1.2.3-z', '1.2.3-alpha'), 1);
  assert.equal(compareVersions('1.2.3-alpha.9007199254740993', '1.2.3-alpha.9007199254740992'), 1);
});
test('invalid strings do not become a plausible version', () => {
  for (const input of ['1.2', '01.2.3', '1.2.3-01', '1.2.3-a..b', '1.2.3-β', 'v1.2.3', '1.2.3\n', '1.2.3 ']) {
    assert.throws(() => parseVersion(input), /invalid|leading/);
  }
  assert.throws(() => parseVersion(null), /invalid/);
  assert.throws(() => parseVersion('1.2.3' + String.fromCharCode(10)), /invalid/);
  assert.throws(() => parseVersion('1.'.repeat(300)), /invalid/);
});
