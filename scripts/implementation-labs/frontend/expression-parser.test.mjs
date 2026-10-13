import test from 'node:test'; import assert from 'node:assert/strict'; import { evaluate } from './expression-parser.mjs';
test('multiplication binds before addition', () => assert.equal(evaluate('2 + 3 * 4'), 14));
test('parentheses override precedence', () => assert.equal(evaluate('(2 + 3) * 4'), 20));
test('left associativity handles subtraction', () => assert.equal(evaluate('10 - 3 - 2'), 5));
test('unexpected trailing token reports its location', () => assert.throws(() => evaluate('1 2'), /unexpected 2 at 2/));
test('missing operand reports a syntax error', () => assert.throws(() => evaluate('2 +'), /expected number/));
