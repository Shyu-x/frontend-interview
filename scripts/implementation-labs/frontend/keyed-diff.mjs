// Return old indices in one increasing subsequence; stable items need no DOM move.
function lisPositions(values) {
  const tails = []; const tailPositions = []; const previous = Array(values.length).fill(-1);
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]; if (value < 0) continue;
    let lo = 0, hi = tails.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid] < value) lo = mid + 1; else hi = mid; }
    tails[lo] = value; previous[i] = lo ? tailPositions[lo - 1] : -1; tailPositions[lo] = i;
  }
  const result = new Set(); let cursor = tailPositions[tails.length - 1];
  while (cursor !== undefined && cursor >= 0) { result.add(cursor); cursor = previous[cursor]; }
  return result;
}
export function diffKeys(oldKeys, newKeys) {
  if (new Set(oldKeys).size !== oldKeys.length || new Set(newKeys).size !== newKeys.length) throw new Error('keys must be unique');
  const oldIndex = new Map(oldKeys.map((key, index) => [key, index]));
  const oldForNew = newKeys.map((key) => oldIndex.has(key) ? oldIndex.get(key) : -1);
  const stable = lisPositions(oldForNew);
  const newKeySet = new Set(newKeys);
  // Use a Set for removals; repeated includes() would make this pass quadratic.
  const remove = oldKeys.filter((key) => !newKeySet.has(key));
  const insert = newKeys.filter((key) => !oldIndex.has(key));
  const move = newKeys.flatMap((key, index) => oldForNew[index] >= 0 && !stable.has(index) ? [{ key, from: oldForNew[index], to: index }] : []);
  return { remove, insert, move, stable: newKeys.filter((_, i) => stable.has(i)) };
}
