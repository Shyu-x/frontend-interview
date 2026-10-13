import test from 'node:test'; import assert from 'node:assert/strict'; import { moveActive } from './combobox.mjs';
const options = [{}, { disabled: true }, {}, {}];
test('down skips disabled entries', () => assert.equal(moveActive(options, 0, 'ArrowDown'), 2));
test('up wraps from first to last enabled option', () => assert.equal(moveActive(options, 0, 'ArrowUp'), 3));
test('home and end select enabled boundaries', () => { assert.equal(moveActive(options, 2, 'Home'), 0); assert.equal(moveActive(options, 0, 'End'), 3); });
test('composition leaves active option unchanged', () => assert.equal(moveActive(options, 0, 'ArrowDown', { composing: true }), 0));
test('all disabled options produce no active descendant', () => assert.equal(moveActive([{ disabled: true }], 0, 'ArrowDown'), -1));
