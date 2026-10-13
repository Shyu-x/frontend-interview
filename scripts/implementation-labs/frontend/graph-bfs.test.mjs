import test from 'node:test'; import assert from 'node:assert/strict'; import { shortestPath } from './graph-bfs.mjs';
const graph = new Map([['a',['b','c']],['b',['d']],['c',['d']],['d',[]]]);
test('returns a path with fewest edges', () => assert.deepEqual(shortestPath(graph, 'a', 'd'), ['a','b','d']));
test('start equals goal returns one node', () => assert.deepEqual(shortestPath(graph, 'a', 'a'), ['a']));
test('unreachable vertex returns null', () => assert.equal(shortestPath(graph, 'd', 'a'), null));
test('cycle does not enqueue a node twice', () => { const g = new Map([['a',['b']],['b',['a','c']],['c',[]]]); assert.deepEqual(shortestPath(g, 'a', 'c'), ['a','b','c']); });
