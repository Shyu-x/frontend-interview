import test from 'node:test';
import assert from 'node:assert/strict';
import { findFolded } from './unicode-search.mjs';

test('case folds ASCII', () => assert.deepEqual(findFolded('React react', 'REACT'), [[0, 5], [6, 11]]));
test('decomposed accent matches unaccented query', () => assert.deepEqual(findFolded('cafe\u0301', 'cafe'), [[0, 5]]));
test('returns UTF-16 offsets after astral prefix', () => assert.deepEqual(findFolded('😀Café', 'cafe'), [[2, 6]]));
test('empty query has no matches', () => assert.deepEqual(findFolded('abc', ''), []));
test('Greek final sigma uses the same per-grapheme lowercasing on both sides', () => assert.deepEqual(findFolded('ΟΣ', 'ος'), [[0, 2]]));
