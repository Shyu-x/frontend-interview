import test from 'node:test';
import assert from 'node:assert/strict';
import { hitTestRect, inversePoint } from './canvas-transform.mjs';

test('inverts translation and non-uniform scaling', () => {
  assert.deepEqual(inversePoint([2, 0, 0, 3, 10, 20], 14, 26), { x: 2, y: 2 });
});
test('tests rectangle geometry in local coordinates after rotation', () => {
  const angle = Math.PI / 2, matrix = [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 20, 0];
  assert.equal(hitTestRect(matrix, { x: 18, y: 1 }, { x: 0, y: 0, width: 2, height: 2 }), true);
  assert.equal(hitTestRect(matrix, { x: 16, y: 1 }, { x: 0, y: 0, width: 2, height: 2 }), false);
});
test('singular transform is a miss instead of division by zero', () => {
  assert.equal(inversePoint([0, 0, 0, 0, 0, 0], 1, 2), null);
  assert.equal(hitTestRect([1, 0, 0, 0, 0, 0], { x: 1, y: 2 }, { x: 0, y: 0, width: 5, height: 5 }), false);
});
