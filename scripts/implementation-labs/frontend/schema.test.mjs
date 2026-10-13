import test from 'node:test'; import assert from 'node:assert/strict'; import { array, object, string } from './schema.mjs';
const parse = object({ name: string(), tags: array(string()) });
test('valid input returns a parsed value', () => assert.deepEqual(parse({ name: 'Ada', tags: ['ui'] }), { ok: true, value: { name: 'Ada', tags: ['ui'] } }));
test('wrong root reports root path', () => assert.deepEqual(parse(null).issues[0].path, []));
test('field errors include field path', () => assert.deepEqual(parse({ name: 2, tags: [] }).issues[0].path, ['name']));
test('array errors include index path', () => assert.deepEqual(parse({ name: 'Ada', tags: ['ok', 9] }).issues[0].path, ['tags', 1]));
