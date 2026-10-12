import assert from 'node:assert/strict';

// 教学模型只拥有语义 ID，不模拟浏览器 DOM focus 或读屏器。
function reconcileFocus(previousIds, nextIds, focusedId) {
  assert.equal(new Set(nextIds).size, nextIds.length, 'semantic IDs must be unique');
  if (nextIds.includes(focusedId)) return focusedId;
  if (focusedId === null) return null; // 不抢走其他区域的焦点。
  const oldIndex = previousIds.indexOf(focusedId);
  if (oldIndex < 0 || nextIds.length === 0) return null;
  return nextIds[Math.min(oldIndex, nextIds.length - 1)];
}

const initial = ['title', 'chart', 'note'];
assert.equal(reconcileFocus(initial, ['note', 'chart', 'title'], 'chart'), 'chart');
assert.equal(reconcileFocus(initial, ['title', 'note'], 'chart'), 'note');
assert.equal(reconcileFocus(initial, ['title', 'chart'], 'note'), 'chart');
assert.equal(reconcileFocus(initial, [], 'chart'), null);
assert.equal(reconcileFocus(initial, ['title', 'note'], null), null);
assert.throws(() => reconcileFocus(initial, ['title', 'title'], 'title'), /unique/);

// 连续删掉焦点对象时，非空集合不能产生不存在的 focusedId。
let ids = initial, focusedId = 'chart';
while (ids.length) {
  const next = ids.filter(id => id !== focusedId);
  focusedId = reconcileFocus(ids, next, focusedId);
  ids = next;
  assert.ok(focusedId === null ? ids.length === 0 : ids.includes(focusedId));
}
console.log('PASS focus-state: stable IDs, deletion fallback, empty state, no focus stealing');
